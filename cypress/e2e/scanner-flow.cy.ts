// cypress/e2e/scanner-flow.cy.ts
// E2E tests for QR/Scanner Attendance flow

describe('Scanner Attendance Flow', () => {
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
    cy.visit('/admin/home');
  });

  it('should display the attendances table on admin home', () => {
    cy.get('table.data-table, .table-container').should('be.visible');
    cy.get('thead th').should('have.length.greaterThan', 3);
  });

  it('should show attendance status badges (authorized/denied)', () => {
    cy.get('.status-badge').should('exist');
  });

  it('should open the scanner modal when FAB is clicked', () => {
    cy.get('.fab-btn').click();
    cy.get('app-qr-scanner-modal, [id="scanner-modal"]').should('be.visible');
  });

  it('should close the scanner modal on cancel', () => {
    cy.get('.fab-btn').click();
    cy.get('app-qr-scanner-modal, [id="scanner-modal"]').should('be.visible');
    cy.get('[id="btn-cancel-scanner"], button').contains(/cancelar|cerrar/i).click();
    cy.get('app-qr-scanner-modal').should('not.exist');
  });

  it('should filter attendances by status', () => {
    cy.get('select').contains('option', 'Autorizados').parent().select('authorized');
    cy.get('table.data-table tbody').should('exist');
  });

  it('should filter attendances by date', () => {
    const today = new Date().toISOString().split('T')[0];
    cy.get('input[type="date"]').clear().type(today);
    cy.get('table.data-table tbody').should('exist');
  });

  it('should search attendances by member name', () => {
    cy.get('input[placeholder*="Buscar"]').type('Test');
    cy.get('table.data-table tbody').should('exist');
  });

  it('should paginate through attendance records', () => {
    cy.get('.pagination-footer').should('be.visible');
    cy.get('.pagination-controls button').should('have.length.greaterThan', 0);
  });

  it('should navigate to member detail when info button clicked', () => {
    cy.get('table.data-table tbody tr').first().within(() => {
      cy.get('.action-btn--info').click();
    });
    cy.url().should('include', '/admin/users/');
  });
});
