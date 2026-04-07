import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, LoginResponse } from './auth.service';
import { environment } from '../../../environments/environment';
import { getMockAuthUser, getMockLoginResponse } from '../testing/test-factories';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jest.Mocked<Router>;

  beforeEach(() => {
    const spy = {
      navigate: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: spy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as jest.Mocked<Router>;
    
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should call the login endpoint and save the session', (done) => {
      const mockResponse = getMockLoginResponse();
      const loginData = { number: '1234567890', password: 'password' };

      service.login(loginData.number, loginData.password).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('fg_token')).toBe(mockResponse.accessToken);
        expect(localStorage.getItem('fg_user')).toContain(mockResponse.user.number);
        expect(service.currentUser()).toEqual(mockResponse.user);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle login error', (done) => {
      const loginData = { number: '1234567890', password: 'password' };
      const errorMessage = 'Invalid credentials';

      service.login(loginData.number, loginData.password).subscribe({
        error: (err) => {
          expect(err.message).toBe(errorMessage);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ message: errorMessage }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('logout', () => {
    it('should call the logout endpoint and clear the session', () => {
      // Setup session
      localStorage.setItem('fg_token', 'mock-token');
      localStorage.setItem('fg_user', JSON.stringify(getMockAuthUser()));

      service.logout();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({});

      expect(localStorage.getItem('fg_token')).toBeNull();
      expect(localStorage.getItem('fg_user')).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('isLoggedIn', () => {
    it('should return true if token is valid and not expired', () => {
      // Mock a non-expired token
      const futureDate = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: futureDate }));
      const mockToken = `header.${payload}.signature`;
      
      localStorage.setItem('fg_token', mockToken);
      // We need to re-initialize or set the signal manually if private currentToken is used
      // Since it's private and initialized in constructor, we might need to cast to any for testing purposes
      (service as any).currentToken.set(mockToken);

      expect(service.isLoggedIn()).toBe(true);
    });

    it('should return false if token is expired', () => {
      const pastDate = Math.floor(Date.now() / 1000) - 3600;
      const payload = btoa(JSON.stringify({ exp: pastDate }));
      const mockToken = `header.${payload}.signature`;
      
      (service as any).currentToken.set(mockToken);

      expect(service.isLoggedIn()).toBe(false);
    });
  });
});
