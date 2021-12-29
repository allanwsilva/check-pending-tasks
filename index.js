const core = require('@actions/core');
const github = require('@actions/github');
const sgMail = require("@sendgrid/mail");
const {Octokit} = require("octokit");

/**
 * https://octokit.github.io/rest.js/v18
 */
let octokit;

/**
 * Repo context.
 */
let context;

/**
 * Entry point.
 * @returns {Promise<void>}
 */
async function run() {
    try {
        initialValidation();

        octokit = new Octokit({auth: process.env.GITHUB_TOKEN});
        context = github.context;

        // filter Issues
        let issues = await octokit.rest.issues.listForRepo({...context.repo, state: 'open'});
        let issuesArr = filterItems(issues);

        // filter PRs
        let pulls = await octokit.rest.pulls.list({...context.repo, state: 'open'});
        let pullsArr = filterItems(pulls);

        // grouping list by assigness
        const groupedPulls = reduceByAssignee(pullsArr);
        const groupedIssues = reduceByAssignee(issuesArr);

        // concatenate and dedupe assignees
        const dupedAssigneesArray = [...new Set(Object.keys(groupedIssues).concat(Object.keys(groupedPulls)))];
        console.debug('assignees array', dupedAssigneesArray);

        // hydrate assignees
        const assignees = await Promise.all(
            dupedAssigneesArray.map(
                async assignee => {
                    return {username: assignee, email: await fetchUser(assignee)};
                }
            )
        );
        console.debug('assignees ', assignees);

        if (assignees?.length === 0) {
            console.debug('NO ITEMS TO BE EMAILED! Stopping execution');
            return;
        }

        // assemble message and send email
        for (let index in assignees) {
            let message = mailHead();
            message += table(groupedIssues[assignees[index].username], 'Issues open');
            message += table(groupedPulls[assignees[index].username], 'Pull Requests Open');
            message += mailTail();
            sendMail(message, assignees[index].email);
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

/**
 * Performs initial input / environment validation.
 */
function initialValidation() {
    if (!process.env.SENDGRID_API_KEY) {
        throw {message: '"SENDGRID_API_KEY" environment variable not set'};
    }

    if (!process.env.GITHUB_TOKEN) {
        throw {message: '"GITHUB_TOKEN" environment variable not set'};
    }

    const email = core.getInput('sendgrid-from-email');

    if (!email) {
        throw {message: '"sendgrid-from-email" input value not set'};
    }

    const regexp = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/;
    if (!regexp.test(email)) {
        throw {message: '"sendgrid-from-email" input value is not a valid email'};
    }
}

/**
 * Fetch assignee email from API.
 * @param username Github username.
 * @returns {Promise<*>}
 */
async function fetchUser(username) {
    let {data: {email}} = await octokit.rest.users.getByUsername({username: username});
    return email;
}

/**
 *
 * Group items by Assignee.
 * @param arr input array.
 * @returns {*|*[]}
 */
function reduceByAssignee(arr) {
    return arr?.reduce((r, a) => {
        r[a.assignee] = [...r[a.assignee] || [], a];
        return r;
    }, {}) || [];
}

/**
 * Filter items with valid assignees and return a simplified array of items.
 * @param arr input array.
 * @returns {*}
 */
function filterItems(arr) {
    return arr?.data.filter(item => item.assignee).map(item => {
        return {
            assignee: item.assignee?.login,
            title: item.title,
            url: item.html_url,
            updated: item.updated_at,
            created: item.created_at
        }
    });
}


/**
 * Creates an Item table (PR/Issues).
 * @param arr input array.
 * @param caption table caption.
 * @returns {string} HTML table.
 */
function table(arr, caption) {
    let message = '';
    if (arr?.length > 0) {
        message = `<table>
                          <caption>${caption}</caption>
                          <tr>
                            <th>Title</th>
                            <th>Created</th>
                            <th>Last Update</th>
                          </tr>`;
        arr.forEach(
            item => {
                const delta = (new Date().getTime() - new Date(item.updated).getTime()) / (1000 * 60 * 60 * 24);
                const style = delta > 7 ? 'red' : (delta > 3 && delta <= 7 ? 'yellow' : 'green');
                return message +=
                    `<tr>
                        <td><a href="${item.url}" target="_blank">${item.title}</a></td>
                        <td>${item.created}</td>
                        <td><span style="color:${style}">${item.updated}</span></td>
                    </tr>`;
            }
        );
        message += `</table>`;
    }
    return message;
}

/**
 *
 * @returns {string}
 */
function mailHead() {
    return `<html>
                <head>
                    <style>
                    table {
                      font-family: arial, sans-serif;
                      border-collapse: collapse;
                      width: 100%;
                    }
                    
                    caption {
                        font-size: 16px;  
                        font-weight: bold;
                    }
                    
                    td, th {
                      border: 1px solid #dddddd;
                      text-align: left;
                      padding: 8px;
                    }
                    
                    tr:nth-child(even) {
                      background-color: #dddddd;
                    }
                    </style>
                </head>
                <body>`;
}

/**
 *
 * @returns {string}
 */
function mailTail() {
    return `</body></html>`;
}

/**
 * Sends the message via Sendgrid.
 * @param message HTML message.
 * @param destination Email destination.
 */
function sendMail(message, destination) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    try {
        let msg = {
            to: destination,
            from: core.getInput('sendgrid-from-email'),
            subject: core.getInput('email-subject'),
            html: message
        };
        sgMail
            .send(msg)
            .then(() => {
                console.debug(`Email sent successfully to ${destination}!`);
            }, error => {
                if (error.response) {
                    console.error(error.response.body)
                }
            });
    } catch (error) {
        console.error('Error when sending mail, it might be something Sendgrid related', error);
    }
}

/**
 * Starts the Action!
 */
run()
