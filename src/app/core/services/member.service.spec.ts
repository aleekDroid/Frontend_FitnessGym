import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MemberService } from './member.service';
import { environment } from '../../../environments/environment';
import { MemberDashboardResponse, FullRoutine, RoutineDay } from '../models/member-dashboard.model';

describe('MemberService', () => {
  let service: MemberService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MemberService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(MemberService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDashboard', () => {
    it('should return member dashboard data', (done) => {
      const mockResponse: MemberDashboardResponse = {
        user: {
          id: 1,
          name: 'John',
          last_name: 'Doe',
          number: '1234567890',
          isSetupPending: false,
          routine: null
        },
        activeSubscription: null,
        recentAttendances: [],
        paymentHistory: []
      };

      service.getDashboard().subscribe(res => {
        expect(res).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user/me`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getQrCode', () => {
    it('should return a blob', (done) => {
      const mockBlob = new Blob(['mock-image-data'], { type: 'image/png' });
      const qrCodeId = 'qr-123';

      service.getQrCode(qrCodeId).subscribe(res => {
        expect(res).toBeInstanceOf(Blob);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user/qr/${qrCodeId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(mockBlob);
    });
  });

  describe('getFullRoutine', () => {
    it('should return the user routine when HTTP 200', (done) => {
      const mockRoutine: FullRoutine = {
        days: [
          { day: 'Lunes', description: 'Pecho', isRestDay: false, exercises: [] }
        ]
      };

      service.getFullRoutine().subscribe(res => {
        expect(res).toEqual(mockRoutine);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user/routine`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRoutine);
    });

    it('should return an empty 6-day routine when HTTP 404', (done) => {
      service.getFullRoutine().subscribe(res => {
        expect(res.days.length).toBe(6);
        expect(res.days[0].day).toBe('Lunes');
        expect(res.days[5].day).toBe('Sábado');
        expect(res.days[0].isRestDay).toBe(false);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user/routine`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should throw error on non-404 HTTP errors', (done) => {
      service.getFullRoutine().subscribe({
        next: () => done.fail('Should have failed with 500 error'),
        error: (err) => {
          expect(err.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user/routine`);
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('saveRoutine', () => {
    it('should POST the routine and return a message', (done) => {
      const mockMessage = { message: 'Routine saved successfully' };
      const days: RoutineDay[] = [
        { day: 'Lunes', description: '', isRestDay: false, exercises: [] }
      ];

      service.saveRoutine(days).subscribe(res => {
        expect(res).toEqual(mockMessage);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user/routine`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ days });
      req.flush(mockMessage);
    });
  });

  describe('updateRoutine', () => {
    it('should PATCH the routine structure partially mapped to POST', (done) => {
      const daysToUpdate = [{ day: 'Lunes', isRestDay: true }];

      service.updateRoutine(daysToUpdate).subscribe(() => {
        expect(true).toBe(true); // Verification completes
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/user/routine`);
      expect(req.request.method).toBe('POST'); // API definition uses POST
      expect(req.request.body).toEqual({ days: daysToUpdate });
      req.flush(null);
    });
  });
});
