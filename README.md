# Spotify 좋아요 곡 월드컵

스포티파이 계정을 통해 "좋아요 표시한 곡"을 가져와 8·16·32·64·128강 토너먼트를 진행하고 최애 곡을 뽑는 Next.js 앱입니다. Vercel에 바로 배포할 수 있도록 구성되었습니다.

## 주요 기능
- **Spotify 로그인 (PKCE)**: OAuth 2.0 + PKCE로 안전하게 액세스 토큰을 발급하고 쿠키에 보관합니다.
- **토너먼트 사이즈 선택**: 8/16/32/64/128강 중 원하는 라운드를 고를 수 있습니다.
- **랜덤 매칭**: 좋아요 표시한 곡을 랜덤으로 섞어 좌우 매칭을 생성합니다.
- **모바일 대응 UI**: Spotify 색감을 살린 초록 + 블랙 기반 반응형 레이아웃입니다.

## 환경 변수
`.env` 파일을 루트에 추가하고 아래 값을 설정하세요. (로컬에서는 `.env.example`을 복사하여 사용 권장)

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

- `SPOTIFY_REDIRECT_URI`는 Vercel 배포 시 `https://your-domain.vercel.app/api/auth/callback` 형태로 변경해야 합니다.
- Spotify Dashboard > Settings > Redirect URIs에도 동일한 값을 등록해야 합니다.

## 개발 환경
```bash
npm install
npm run dev
```

로컬에서 `http://localhost:3000`을 열면 됩니다.

## 배포 (Vercel)
1. Vercel에서 새 프로젝트로 이 레포를 가져옵니다.
2. **Environment Variables**에 위 3개의 변수를 추가합니다.
3. 빌드/출력 설정은 기본값 (`npm run build`, `Next.js`)을 그대로 사용하면 됩니다.
4. 배포 후 Spotify Dashboard에 프로덕션 Redirect URI를 추가합니다.

## 기타
- 이미지는 `i.scdn.co`, `mosaic.scdn.co`, `image-cdn-ak.spotifycdn.com` 도메인만 허용되어 있습니다.
- 토큰은 HttpOnly + SameSite=Lax 쿠키로 저장되며, 만료 시 자동으로 refresh token을 이용해 갱신합니다.
