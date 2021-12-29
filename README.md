# Check for Open Pull Requests and Issues and send emails to Assignees  

<p>
  <a href="https://github.com/allanwsilva/check-pending-tasks/actions"><img alt="javscript-action status" src="https://github.com/allanwsilva/check-pending-tasks/workflows/units-test/badge.svg"></a>
</p>

This Action is handy when it comes to "remind" people of open Pull Requests or Issues in order to avoid lingering 
tasks... you can set this up using [Scheduled Events](https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows#scheduled-events) and run it daily, for example.

It uses the [Sendgrid API](https://sendgrid.com/) to send emails so you have to create an account and provide the 
**SENDGRID_API_KEY** as an environment variable, along with a valid [Github Token](https://github.com/settings/tokens) 
as an environment variable too (see details below). 


## Usage

You can now consume the action:

```yaml
uses: allanwsilva/check-pending-tasks@v1
with:
  sendgrid-from-email: valid@email.com
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  SENDGRID_API_KEY: ${{ secrets.SENDGRID_API_KEY }}
```

:rocket: :rocket: :rocket:
