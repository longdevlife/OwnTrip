---
description: Quy tắc cấu trúc thư mục chuẩn cho dự án OwnTrip React Native Expo
---

# 📁 OwnTrip - Quy Tắc Cấu Trúc Thư Mục

> Tham khảo từ blog chính thức Expo: [How to organize Expo app folder structure](https://expo.dev/blog/expo-app-folder-structure-best-practices) bởi **Kadi Kraman** (Kỹ sư Expo).

## Cấu trúc tổng quan

```
owntrip/
├── src/
│   ├── app/                        # 🚦 ROUTING ONLY - Expo Router (file-based)
│   │   ├── _layout.tsx             # Layout gốc (Stack Navigator)
│   │   ├── index.tsx               # Route "/" → render screen tương ứng
│   │   ├── (auth)/                 # Group routes cho Auth (login, register)
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx           # Route "/login" → render LoginScreen
│   │   │   └── register.tsx        # Route "/register" → render RegisterScreen
│   │   └── (tabs)/                 # Group routes cho Tab Navigator
│   │       ├── _layout.tsx         # Tab layout (Home, Explore, Profile...)
│   │       ├── index.tsx           # Tab "Home" → render HomeScreen
│   │       ├── explore.tsx         # Tab "Explore" → render ExploreScreen
│   │       └── profile.tsx         # Tab "Profile" → render ProfileScreen
│   │
│   ├── screens/                    # 🖥️ MÀN HÌNH - Toàn bộ UI logic của từng trang
│   │   ├── auth/                   # Nhóm màn hình xác thực
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── home/                   # Nhóm màn hình trang chủ
│   │   │   ├── index.tsx           # HomeScreen chính
│   │   │   └── components/         # Component CHỈ dùng trong Home
│   │   │       └── trip-card.tsx
│   │   ├── explore/
│   │   │   └── index.tsx
│   │   └── profile/
│   │       └── index.tsx
│   │
│   ├── components/                 # 🧩 COMPONENT TÁI SỬ DỤNG - Dùng ở nhiều màn hình
│   │   ├── ui/                     # Component UI cơ bản (Button, Input, Card...)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── loading.tsx
│   │   └── shared/                 # Component phức tạp dùng chung
│   │       ├── header.tsx
│   │       └── avatar.tsx
│   │
│   ├── services/                   # 🌐 API - Gọi backend, axios config
│   │   ├── axiosClient.ts          # Cấu hình Axios (interceptors, base URL)
│   │   ├── authService.ts          # API xác thực (login, register, logout)
│   │   └── tripService.ts          # API trips (CRUD)
│   │
│   ├── hooks/                      # 🪝 CUSTOM HOOKS - Logic tái sử dụng
│   │   ├── use-auth.ts             # Hook quản lý auth state
│   │   └── use-theme.ts
│   │
│   ├── constants/                  # 📐 HẰNG SỐ - Giá trị không đổi
│   │   ├── theme.ts                # Màu sắc, font, spacing
│   │   ├── api.ts                  # Base URL, endpoints
│   │   └── app.ts                  # Tên app, version...
│   │
│   ├── types/                      # 📝 TYPESCRIPT TYPES - Kiểu dữ liệu chung
│   │   ├── user.ts                 # interface User, LoginRequest...
│   │   ├── trip.ts                 # interface Trip, TripDetail...
│   │   └── navigation.ts          # Types cho navigation params
│   │
│   ├── utils/                      # 🔧 TIỆN ÍCH - Hàm helper nhỏ
│   │   ├── format-date.ts          # Format ngày tháng
│   │   ├── format-currency.ts      # Format tiền tệ
│   │   └── storage.ts              # AsyncStorage/SecureStore wrapper
│   │
│   ├── store/                      # 📦 STATE MANAGEMENT (Zustand/Redux)
│   │   ├── auth-store.ts           # Auth state (user, token, isLoggedIn)
│   │   └── trip-store.ts           # Trip state
│   │
│   └── assets/                     # 🖼️ TÀI NGUYÊN TĨNH
│       ├── images/                 # Ảnh (login-bg.png, logo.png)
│       ├── icons/                  # Icon tùy chỉnh
│       └── fonts/                  # Font chữ tùy chỉnh
│
├── app.json                        # Cấu hình Expo
├── tsconfig.json                   # Cấu hình TypeScript
├── package.json
├── .prettierrc                     # Cấu hình Prettier
├── .editorconfig                   # Cấu hình Editor
└── eslint.config.js                # Cấu hình ESLint
```

## Quy tắc BẮT BUỘC

### 1. `src/app/` — CHỈ chứa ROUTING, KHÔNG chứa UI logic
- Mỗi file trong `app/` chỉ import và render screen từ `src/screens/`
- KHÔNG viết StyleSheet, UI phức tạp, hay business logic trong `app/`
- Ví dụ đúng:
```tsx
// src/app/(auth)/login.tsx
import LoginScreen from '@/screens/auth/LoginScreen';
export default function Login() {
  return <LoginScreen />;
}
```

### 2. `src/screens/` — Toàn bộ UI của từng trang
- Mỗi màn hình lớn có **thư mục riêng** chứa `index.tsx` + `components/`
- Component chỉ dùng trong 1 màn hình → đặt trong `screens/[tên-màn]/components/`
- Component dùng ở nhiều màn hình → chuyển sang `src/components/`

### 3. `src/components/` — Component TÁI SỬ DỤNG
- `ui/` → component nhỏ: Button, Input, Card, Loading, Modal...
- `shared/` → component lớn hơn dùng lại: Header, Avatar, SearchBar...

### 4. `src/services/` — Mọi API call
- 1 service = 1 nhóm API (authService, tripService, userService)
- Luôn dùng `axiosClient.ts` để gọi, KHÔNG dùng `fetch()` trực tiếp

### 5. `src/types/` — TypeScript definitions
- 1 file = 1 entity (user.ts, trip.ts, booking.ts)
- KHÔNG định nghĩa type inline trong component

### 6. Quy tắc đặt tên file
- **kebab-case** cho tất cả file: `login-screen.tsx`, `format-date.ts`, `use-auth.ts`
- **Ngoại lệ Screen**: PascalCase cho screen chính: `LoginScreen.tsx`, `HomeScreen.tsx`
- Component export = tên PascalCase: `export function TripCard() {}`

### 7. Import alias
- Luôn dùng `@/` thay vì relative path (`../../`)
```tsx
// ✅ Đúng
import { Button } from '@/components/ui/button';

// ❌ Sai
import { Button } from '../../../components/ui/button';
```

## Tóm tắt nhanh: "File này đặt ở đâu?"

| Loại file | Đặt ở đâu |
|-----------|-----------|
| Route/Navigation | `src/app/` |
| UI màn hình | `src/screens/[tên-màn]/` |
| Component chỉ dùng trong 1 màn | `src/screens/[tên-màn]/components/` |
| Component dùng lại nhiều nơi | `src/components/` |
| Gọi API | `src/services/` |
| Hook tái sử dụng | `src/hooks/` |
| Hằng số, config | `src/constants/` |
| TypeScript types | `src/types/` |
| Hàm helper (format, validate) | `src/utils/` |
| State management | `src/store/` |
| Ảnh, icon, font | `src/assets/` |
