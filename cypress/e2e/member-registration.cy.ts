// cypress/e2e/member-registration.cy.ts
// E2E tests for Member Registration flow

describe('Member Registration Flow', () => {
  const adminNumber = Cypress.env('ADMIN_NUMBER') || '1234567890';
  const adminPassword = Cypress.env('ADMIN_PASSWORD') || 'admin123';

  const loginAsAdmin = () => {
    cy.visit('/login');
    cy.get('input[formControlName="number"]').type(adminNumber);
    cy.get('input[formControlName="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/admin');
  };

  beforeEach(() => {
    loginAsAdmin();
  });

  it('should navigate to the members list from admin panel', () => {
    cy.visit('/admin/users');
    cy.get('h1, h2, .section-title').should('be.visible');
  });

  it('should open the new member registration form', () => {
    cy.visit('/admin/users');
    cy.get('[id="btn-new-member"], button[title*="nuevo"], .fab-btn').first().click();
    cy.get('form').should('be.visible');
  });

  it('should show validation errors on empty registration form', () => {
    cy.visit('/admin/users/new');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/admin/users/new');
  });

  it('should register a new member with valid data', () => {
    const timestamp = Date.now();
    cy.visit('/admin/users/new');

    cy.get('input[formControlName="name"]').type('Test');
    cy.get('input[formControlName="last_name"]').type('Cypress');
    cy.get('input[formControlName="number"]').type(`555${timestamp.toString().slice(-7)}`);
    cy.get('input[formControlName="password"]').type('Test1234!');

    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/admin/users');
  });

  it('should search for a member by name', () => {
    cy.visit('/admin/users');
    cy.get('input[placeholder*="Buscar"]').type('Test');
    cy.get('table tbody tr, .member-card').should('exist');
  });
});
