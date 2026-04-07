import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks, flushMicrotasks } from '@angular/core/testing';
import { QrScannerModalComponent } from './qr-scanner-modal.component';

describe('QrScannerModalComponent', () => {
  let component: QrScannerModalComponent;
  let fixture: ComponentFixture<QrScannerModalComponent>;
  let mockMediaStream: any;
  let mockTrack: any;

  beforeAll(() => {
    // Mock para window.Audio
    globalThis.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    globalThis.HTMLMediaElement.prototype.pause = jest.fn();
    globalThis.HTMLVideoElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    globalThis.HTMLVideoElement.prototype.pause = jest.fn();
  });

  beforeEach(async () => {
    mockTrack = {
      getCapabilities: jest.fn().mockReturnValue({ torch: true, zoom: { min: 1, max: 3 } }),
      applyConstraints: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn()
    };
    
    mockMediaStream = {
      getVideoTracks: jest.fn().mockReturnValue([mockTrack]),
      getTracks: jest.fn().mockReturnValue([mockTrack])
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue(mockMediaStream)
      },
      writable: true
    });

    await TestBed.configureTestingModule({
      imports: [QrScannerModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(QrScannerModalComponent);
    component = fixture.componentInstance;

    const readerEl = document.createElement('div');
    readerEl.id = 'reader';
    document.body.appendChild(readerEl);
  });

  afterEach(() => {
    jest.clearAllMocks();
    const readerEl = document.getElementById('reader');
    if (readerEl) readerEl.remove();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct hintText based on mode and unsupervised state', () => {
    component.unsupervised = true;
    expect(component.hintText).toBe('Modo Automático Activo');

    component.unsupervised = false;
    component.mode = 'qr';
    expect(component.hintText).toBe('Apunta al código QR');

    component.mode = 'barcode';
    expect(component.hintText).toBe('Apunta al código de barras');
  });

  it('should toggle unsupervised state and emit the new value', () => {
    jest.spyOn(component.unsupervisedChange, 'emit');
    component.unsupervised = false;
    component.toggleUnsupervised();
    
    expect(component.unsupervisedChange.emit).toHaveBeenCalledWith(true);
  });

  it('should start scanner correctly on init using jsQR (qr mode)', async () => {
    component.mode = 'qr';
    await (component as any).startScanner();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(component.isTorchSupported).toBe(true);
    expect(component.isZoomSupported).toBe(true);
    
    // Cleanup
    component.ngOnDestroy();
  });

  it('should play success or error audio on status change', () => {
    const playSpy = jest.spyOn(globalThis.HTMLMediaElement.prototype, 'play');
    
    // Simulated SimpleChanges
    component.ngOnChanges({
      status: {
        previousValue: 'idle',
        currentValue: 'success',
        firstChange: false,
        isFirstChange: () => false
      } as any
    });
    
    expect(playSpy).toHaveBeenCalled();
  });

  it('should toggle torch if supported', async () => {
    component.isTorchSupported = true;
    component.isTorchOn = false;
    // Inject the mock media stream dynamically manually as if startScanner generated it.
    (component as any).videoStream = mockMediaStream;

    await component.toggleTorch();

    expect(component.isTorchOn).toBe(true);
    expect(mockTrack.applyConstraints).toHaveBeenCalledWith({
      advanced: [{ torch: true }]
    });
  });

  it('should toggle zoom if supported', async () => {
    component.isZoomSupported = true;
    component.isZoomOn = false;
    (component as any).videoStream = mockMediaStream;

    await component.toggleZoom();

    expect(component.isZoomOn).toBe(true);
    expect(mockTrack.applyConstraints).toHaveBeenCalledWith({
      advanced: [{ zoom: 2 }] // It uses capabilities max or 2
    });
  });

  it('should stop scanner and clear resources on destroy', async () => {
    component.mode = 'qr';
    await (component as any).startScanner();
    
    component.ngOnDestroy();

    expect(mockTrack.stop).toHaveBeenCalled();
    expect((component as any).videoStream).toBeNull();
    expect((component as any).videoEl).toBeNull();
    expect((component as any).canvasEl).toBeNull();
  });
});
