# 🏋️ Fitness Gym — Frontend Angular

## Paleta de colores
| Variable       | Hex       | Uso                    |
|---------------|-----------|------------------------|
| `--dark`       | `#1D1616` | Fondo principal        |
| `--primary`    | `#8E1616` | Rojo oscuro / énfasis  |
| `--accent`     | `#D84040` | Rojo brillante / CTAs  |
| `--light`      | `#EEEEEE` | Texto principal        |

## Tipografía
- **Bebas Neue** — Títulos, headers, números grandes (Google Fonts)
- **Rajdhani** — Cuerpo, navegación, formularios (Google Fonts)

---

## Instalación

```bash
npm install
ng serve
```

La app corre en `http://localhost:4200`

## Credenciales demo (mock)
| Rol    | Número     | Contraseña |
|--------|-----------|------------|
| Admin  | 123456789  | admin123   |
| Miembro| 1234567890 | member123  |

---

## Estructura de archivos

```
src/
├── app/
│   ├── app.component.ts          # Root component
│   ├── app.config.ts             # App configuration
│   ├── app.routes.ts             # Routing
│   ├── core/
│   │   ├── guards/
│   │   │   └── auth.guard.ts     # Auth, Admin, Public guards
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   ├── product.model.ts
│   │   │   └── subscription.model.ts
│   │   └── services/
│   │       ├── auth.service.ts         # Login / logout / token
│   │       ├── users.service.ts        # CRUD usuarios
│   │       ├── products.service.ts     # CRUD productos
│   │       └── subscriptions.service.ts# CRUD membresías + stats
│   └── pages/
│       ├── landing/              # Landing page pública
│       ├── login/                # Pantalla de login
│       └── admin/
│           ├── admin-layout.component  # Navbar admin + <router-outlet>
│           ├── home/             # Asistencias del día (QR)
│           ├── users/            # CRUD usuarios
│           ├── inventory/        # CRUD productos/inventario
│           ├── prices/           # CRUD tipos de membresía
│           └── dashboard/        # Estadísticas y gráficas
├── environments/
│   └── environment.ts            # ← Cambia apiUrl aquí
└── styles.scss                   # Estilos globales + variables CSS
```

---

## Conectar con el backend NestJS

1. Modifica `src/environments/environment.ts`:
   ```ts
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000/api' 
   };
   ```

2. En cada servicio (`users.service.ts`, etc.), **comenta el bloque mock** y **descomenta la línea REAL**:
   ```ts
   // REAL:
   return this.http.get<UserWithMembership[]>(`${environment.apiUrl}/users`, { headers: this.getHeaders() });
   // return of([...this.mockUsers]).pipe(delay(300));
   ```

3. El token JWT se envía automáticamente en el header `Authorization: Bearer <token>`.

---

## Assets necesarios

Coloca estas imágenes en `public/assets/`:

```
public/
└── assets/
    ├── FItnessGym.PNG
    └── slides/
        ├── slide-1.jpg         ← Carrusel: imagen principal
        ├── slide-2.jpg         ← Carrusel: promo estudiantes
        ├── slide-3.jpg         ← Carrusel: plan pareja
        └── slide-4.jpg         ← Carrusel: membresía anual
```

Mientras se registran las demás imágenes, el carrusel mostrará el gradiente de fondo `#2a1010` como fallback.

