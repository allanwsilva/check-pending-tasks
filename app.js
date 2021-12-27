/**
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
    app.log("Yay! The app was loaded!");

    app.on("issues.opened", async (context) => {

        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
            to: 'allanwsilva@gmail.com',
            from: 'github@github.com', // Use the email address or domain you verified above
            subject: 'Check out these Pending Github tasks',
            text: 'and easy to do anywhere, even with Node.js',
            html: '<strong>and easy to do anywhere, even with Node.js</strong>',
        };
        //ES6
        sgMail
            .send(msg)
            .then(() => {
            }, error => {
                console.error(error);

                if (error.response) {
                    console.error(error.response.body)
                }
            });
        return context.octokit.issues.createComment(
            context.issue({body: "Hello, World!"})
        );
    });
};
