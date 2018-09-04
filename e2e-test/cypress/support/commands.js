// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

const baseUrl = Cypress.env("API_BASE_URL") || "/test";

let token = undefined;

Cypress.Commands.add("login", (username = "mstein", password = "test") => {
  cy
    .request({
      url: `${baseUrl}/api/user.authenticate`, // assuming you've exposed a seeds route
      method: "POST",
      body: { apiVersion: "1.0", data: { user: { id: username, password: password } } }
    })
    .its("body")
    .then(body => {
      const state = {
        login: {
          jwt: body.data.user.token,
          environment: "Test",
          productionActive: false,
          language: "en-gb",
          id: body.data.user.id,
          displayName: body.data.user.displayName,
          organization: body.data.user.organization,
          allowedIntents: body.data.user.allowedIntents
        }
      };
      localStorage.setItem("state", JSON.stringify(state));
      token = body.data.user.token;
    });
});

Cypress.Commands.add("fetchProjects", () => {
  cy
    .request({
      url: `${baseUrl}/api/project.list`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .its("body")
    .then(body => Promise.resolve(body.data.items));
});

Cypress.Commands.add("fetchSubprojects", projectId => {
  cy
    .request({
      url: `${baseUrl}/api/project.viewDetails?projectId=${projectId}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }      
    })
    .its("body")
    .then(body => Promise.resolve(body.data.subprojects));
});

Cypress.Commands.add("createWorkflowItem",(projectId,subprojectId,displayName, amount, currency, amountType, description, status, documents)  => {
  cy
    .request({
      url: `${baseUrl}/api/subproject.createWorkflowitem`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: { apiVersion: "1.0", data: { 
        projectId: projectId,
        subprojectId: subprojectId,
        displayName: displayName,
        amount: amount,
        currency: currency,
        amountType: amountType,
        description: description,
        status: status,
        documents: documents } }
    })
    .its("body")
    .then(body => Promise.resolve(body.data.created));
});