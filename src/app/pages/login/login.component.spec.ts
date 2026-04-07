import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization and Validation', () => {
    it('should initialize with empty form', () => {
      expect(component.loginForm.value).toEqual({ number: '', password: '' });
      expect(component.loginForm.valid).toBe(false);
    });

    it('should validate number field', () => {
      const numberControl = component.loginForm.get('number');
      expect(numberControl?.valid).toBe(false);

      // Required
      numberControl?.setValue('');
      expect(numberControl?.hasError('required')).toBe(true);

      // Min length
      numberControl?.setValue('123456');
      expect(numberControl?.hasError('minlength')).toBe(true);

      // Valid
      numberControl?.setValue('1234567');
      expect(numberControl?.valid).toBe(true);
    });

    it('should validate password field', () => {
      const passwordControl = component.loginForm.get('password');
      expect(passwordControl?.valid).toBe(false);

      // Required
      passwordControl?.setValue('');
      expect(passwordControl?.hasError('required')).toBe(true);

      // Min length
      passwordControl?.setValue('12345');
      expect(passwordControl?.hasError('minlength')).toBe(true);

      // Valid
      passwordControl?.setValue('123456');
      expect(passwordControl?.valid).toBe(true);
    });
  });

  describe('togglePassword', () => {
    it('should toggle the showPassword signal', () => {
      expect(component.showPassword()).toBe(false);
      component.togglePassword();
      expect(component.showPassword()).toBe(true);
      component.togglePassword();
      expect(component.showPassword()).toBe(false);
    });
  });

  describe('goBack', () => {
    it('should navigate to root', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('onSubmit', () => {
    it('should not call authService.login if form is invalid', () => {
      component.loginForm.setValue({ number: '', password: '' });
      component.onSubmit();
      
      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(component.loginForm.touched).toBe(true);
    });

    it('should navigate to admin home when admin logs in successfully', fakeAsync(() => {
      component.loginForm.setValue({ number: '1234567', password: 'password123' });
      mockAuthService.login.mockReturnValue(of({ user: { role: 'admin' }, token: 'fake-token' }));

      component.onSubmit();
      
      expect(component.errorMsg()).toBe('');

      expect(mockAuthService.login).toHaveBeenCalledWith('1234567', 'password123');
      expect(component.loading()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/home']);
    }));

    it('should navigate to member dashboard when member logs in successfully', fakeAsync(() => {
      component.loginForm.setValue({ number: '1234567', password: 'password123' });
      mockAuthService.login.mockReturnValue(of({ user: { role: 'member' }, token: 'fake-token' }));

      component.onSubmit();
      tick();

      expect(component.loading()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/member/dashboard']);
    }));

    it('should navigate to root if role is unknown', fakeAsync(() => {
      component.loginForm.setValue({ number: '1234567', password: 'password123' });
      mockAuthService.login.mockReturnValue(of({ user: { role: 'unknown' }, token: 'fake-token' }));

      component.onSubmit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    }));

    it('should handle login error', fakeAsync(() => {
      component.loginForm.setValue({ number: '1234567', password: 'password123' });
      mockAuthService.login.mockReturnValue(throwError(() => new Error('Credenciales inválidas')));

      component.onSubmit();
      tick();

      expect(component.loading()).toBe(false);
      expect(component.errorMsg()).toBe('Credenciales inválidas');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));

    it('should set default error message if error has no message', fakeAsync(() => {
      component.loginForm.setValue({ number: '1234567', password: 'password123' });
      mockAuthService.login.mockReturnValue(throwError(() => ({})));

      component.onSubmit();

      expect(component.errorMsg()).toBe('Error al iniciar sesión');
    }));
  });
});
