// src/app/pages/landing/landing.component.ts
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SubscriptionsService } from '../../core/services/subscriptions.service';
import { SubscriptionType } from '../../core/models/subscription.model';

interface CarouselSlide {
  id: number;
  image: string;        // path: 'assets/slides/slide-1.jpg'
  title: string;
  subtitle: string;
  cta?: string;
  badge?: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit, OnDestroy {
  currentSlide = signal(0);
  subscriptionTypes: SubscriptionType[] = [];
  menuOpen = signal(false);

  private timer?: any;

  // ── Edit slides here with your own images & copy ──
  slides: CarouselSlide[] = [
    {
      id: 1,
      image: 'assets/slides/slide-1.PNG',   
      title: 'FORJA TU MEJOR VERSIÓN',
      subtitle: 'Equipos de última generación • Entrenadores certificados',
      cta: 'Conoce nuestros planes',
    },
    {
      id: 2,
      image: 'assets/slides/slide-2.PNG',
      title: 'ESTUDIANTES UTEQ',
      subtitle: 'Membresía mensual con precio especial para ti',
      badge: '$350 / mes',
      cta: 'Aprovecha la oferta',
    },
    {
      id: 3,
      image: 'assets/slides/slide-3.jpg',
      title: 'PLAN PAREJA',
      subtitle: 'Entrena junto a quien más quieres. Sin excusas.',
      badge: '2 personas, 1 precio',
      cta: 'Ver planes',
    },
    {
      id: 4,
      image: 'assets/slides/slide-4.jpg',
      title: 'MEMBRESÍA ANUAL',
      subtitle: 'El mejor precio del año, hoy. No lo dejes pasar.',
      cta: 'Ver precios anuales',
    },
  ];

  schedule = [
    { day: 'Lunes a Viernes',  hours: '6:00 – 22:00' },
    { day: 'Sábado',           hours: '7:00 – 20:00' },
    { day: 'Domingo',          hours: '8:00 – 14:00' },
  ];

  constructor(
    private router: Router,
    private subscriptionsService: SubscriptionsService
  ) {}

  ngOnInit(): void {
    this.startCarousel();
    this.subscriptionsService.getAll().subscribe(types => {
      this.subscriptionTypes = types.filter(t => t.status === 'active');
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  startCarousel(): void {
    this.timer = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  nextSlide(): void {
    this.currentSlide.update(i => (i + 1) % this.slides.length);
  }

  prevSlide(): void {
    this.currentSlide.update(i => (i - 1 + this.slides.length) % this.slides.length);
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    clearInterval(this.timer);
    this.startCarousel();
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    this.menuOpen.set(false);
  }
}
