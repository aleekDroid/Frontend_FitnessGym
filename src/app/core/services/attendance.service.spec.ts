import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AttendanceService } from './attendance.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { getMockAttendanceResponse, getMockAttendanceHistoryItem } from '../testing/test-factories';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jest.Mocked<AuthService>;

  beforeEach(() => {
    const authSpy = {
      getToken: jest.fn().mockReturnValue('mock-token'),
      isLoggedIn: jest.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        AttendanceService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(AttendanceService);
    httpMock = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('registerAttendance', () => {
    it('should call the attendances endpoint with the qr code', (done) => {
      const mockResponse = getMockAttendanceResponse({ status: 'authorized' });
      const qrCodeId = 'qr-123456';

      service.registerAttendance(qrCodeId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(authServiceSpy.getToken).toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/attendances`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ qrCodeId });
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
      req.flush(mockResponse);
    });

    it('should handle denied attendance registration', (done) => {
      const mockResponse = getMockAttendanceResponse({ status: 'denied', deny_reason: 'Membresía Vencida' });
      const qrCodeId = 'qr-123456';

      service.registerAttendance(qrCodeId).subscribe(response => {
        expect(response.status).toBe('denied');
        expect(response.deny_reason).toBe('Membresía Vencida');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/attendances`);
      req.flush(mockResponse);
    });
  });

  describe('getLastAttendances', () => {
    it('should fetch the last attendances for a user', (done) => {
      const mockHistory = [
        getMockAttendanceHistoryItem({ id: 1, user_id: 10 }),
        getMockAttendanceHistoryItem({ id: 2, user_id: 10 })
      ];
      const userId = 10;

      service.getLastAttendances(userId).subscribe(history => {
        expect(history).toEqual(mockHistory);
        expect(history.length).toBe(2);
        expect(authServiceSpy.getToken).toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/attendances/last/${userId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
      req.flush(mockHistory);
    });
  });
});
