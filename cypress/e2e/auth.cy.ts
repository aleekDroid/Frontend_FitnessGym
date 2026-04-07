// cypress/e2e/auth.cy.ts
// E2E tests for Authentication flow

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display the login form', () => {
    cy.get('h1, h2, .auth-title, .login-title').should('be.visible');
    cy.get('input[formControlName="number"]').should('be.visible');
    cy.get('input[formControlName="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('should show validation errors when submitting empty form', () => {
    cy.get('button[type="submit"]').click();
    // Form should remain on login page since it's invalid
    cy.url().should('include', '/login');
  });

  it('should show error message for invalid credentials', () => {
    cy.get('input[formControlName="number"]').type('0000000000');
    cy.get('input[formControlName="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    // Should stay on login page and show an error
    cy.url().should('include', '/login');
  });

  it('should navigate to admin home after admin login', () => {
    // Uses test credentials – requires backend to be running
    cy.get('input[formControlName="number"]').type(Cypress.env('ADMIN_NUMBER') || '1234567890');
    cy.get('input[formControlName="password"]').type(Cypress.env('ADMIN_PASSWORD') || 'admin123');
    cy.get('button[type="submit"]').click();
    // Admin user navigates to /admin/home
    cy.url().should('include', '/admin');
  });

  it('should redirect unauthenticated users to login', () => {
    cy.visit('/admin/home');
    cy.url().should('include', '/login');
  });

  it('should toggle password visibility', () => {
    cy.get('input[formControlName="password"]').should('have.attr', 'type', 'password');
    cy.get('[id="toggle-password"], button[title*="contraseña"]').first().click();
    cy.get('input[formControlName="password"]').should('have.attr', 'type', 'text');
  });
});
