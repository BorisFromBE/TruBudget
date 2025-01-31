describe("Check if Trubudget Environment is ready", () => {
  const apiBaseUrl = Cypress.env("API_BASE_URL") || `${Cypress.config("baseUrl")}/test`;
  const exportServiceBaseUrl =
    Cypress.env("EXPORT_SERVICE_BASE_URL") || `${Cypress.config("baseUrl")}/test/api/export/xlsx`;

  it("API is connected and ready", function() {
    cy.task("awaitApiReady", apiBaseUrl, 12, 30000);
  });
  it("Swagger documentation of API is accessible", function() {
    cy.visit(`${apiBaseUrl}/api/documentation/static/index.html`).contains("h2", "TruBudget API documentation");
  });
  it("Excel Export Service is connected and ready", function() {
    cy.task("awaitExcelExportReady", exportServiceBaseUrl, 10, 20000);
  });
  it("Provisioning has completed successfully", function() {
    cy.task("awaitProvisioning", apiBaseUrl, 10, 20000);
  });
});
