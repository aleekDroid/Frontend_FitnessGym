// src/app/pages/landing/landing.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  signal,
  PLATFORM_ID,
  Inject,
} from "@angular/core";
import { isPlatformBrowser, CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { SubscriptionsService } from "../../core/services/subscriptions.service";
import { SubscriptionType } from "../../core/models/subscription.model";
import * as L from "leaflet";

interface CarouselSlide {
  id: number;
  image: string; // path: 'assets/slides/slide-1.jpg'
  title: string;
  subtitle: string;
  cta?: string;
  badge?: string;
}

@Component({
  selector: "app-landing",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./landing.component.html",
  styleUrls: ["./landing.component.scss"],
})
export class LandingComponent implements OnInit, OnDestroy, AfterViewInit {
  currentSlide = signal(0);
  subscriptionTypes: SubscriptionType[] = [];
  menuOpen = signal(false);

  // Pagination for prices
  currentPage = signal(1);
  totalPages = signal(1);
  loadingPrices = signal(false);

  private timer?: any;
  private map?: L.Map;

  // ── Edit slides here with your own images & copy ──
  slides: CarouselSlide[] = [
    {
      id: 1,
      image: "assets/slides/slide-1.png",
      title: "FORJA TU MEJOR VERSIÓN",
      subtitle: "Equipos de última generación • Entrenadores certificados",
      cta: "Conoce nuestros planes",
    },
    {
      id: 2,
      image: "assets/slides/slide-2.png",
      title: "ESTUDIANTES UTEQ",
      subtitle: "Membresía mensual con precio especial para ti",
      badge: "$350 / mes",
      cta: "Aprovecha la oferta",
    },
    {
      id: 3,
      image: "assets/slides/slide-3.jpg",
      title: "PLAN PAREJA",
      subtitle: "Entrena junto a quien más quieres. Sin excusas.",
      badge: "2 personas, 1 precio",
      cta: "Ver planes",
    },
    {
      id: 4,
      image: "assets/slides/slide-4.jpg",
      title: "MEMBRESÍA ANUAL",
      subtitle: "El mejor precio del año, hoy. No lo dejes pasar.",
      cta: "Ver precios anuales",
    },
  ];

  schedule = [
    { day: "Lunes a Viernes", hours: "6:00 – 22:00" },
    { day: "Sábado", hours: "7:00 – 20:00" },
  ];

  constructor(
    private readonly router: Router,
    private readonly subscriptionsService: SubscriptionsService,
    @Inject(PLATFORM_ID) private readonly platformId: any,
  ) {}

  ngOnInit(): void {
    this.startCarousel();
    this.loadPrices();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
    }
  }

  private initMap(): void {
    // Coordenadas exactas proporcionadas por el usuario
    const coords: L.LatLngExpression = [20.652889, -100.404444];

    this.map = L.map("map", {
      center: coords,
      zoom: 18,
      scrollWheelZoom: false, // Mejor experiencia en landing
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(this.map);

    // Marker personalizado con estilo del Gym
    const gymIcon = L.divIcon({
      className: "custom-gym-marker",
      html: `
        <div class="marker-pin"></div>
        <span class="marker-emoji">🔥</span>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 36],
      popupAnchor: [0, -36],
    });

    L.marker(coords, { icon: gymIcon })
      .addTo(this.map)
      .bindPopup(
        `
        <div class="map-popup">
          <strong style="color: #D84040; font-family: 'Bebas Neue'; font-size: 1.2rem;">FITNESS GYM</strong><br>
          De La Patria 515, Lomas de San Pedrito.<br>
          <small>Frente a la UTEQ</small>
        </div>
      `,
      )
      .openPopup();
  }

  loadPrices(): void {
    this.loadingPrices.set(true);
    this.subscriptionsService
      .getAll(this.currentPage(), 4, undefined, "active")
      .subscribe({
        next: (res) => {
          this.subscriptionTypes = res.data;
          this.totalPages.set(res.meta.totalPages);
          this.loadingPrices.set(false);
        },
        error: (err) => {
          console.warn(
            "No se pudieron cargar los tipos de suscripción:",
            err.message,
          );
          this.subscriptionTypes = [];
          this.loadingPrices.set(false);
        },
      });
  }

  changePage(delta: number): void {
    const next = this.currentPage() + delta;
    if (next >= 1 && next <= this.totalPages()) {
      this.currentPage.set(next);
      this.loadPrices();
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    if (this.map) {
      this.map.remove();
    }
  }

  startCarousel(): void {
    this.timer = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  nextSlide(): void {
    this.currentSlide.update((i) => (i + 1) % this.slides.length);
  }

  prevSlide(): void {
    this.currentSlide.update(
      (i) => (i - 1 + this.slides.length) % this.slides.length,
    );
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    clearInterval(this.timer);
    this.startCarousel();
  }

  goToLogin(): void {
    this.router.navigate(["/login"]);
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    this.menuOpen.set(false);
  }
}
