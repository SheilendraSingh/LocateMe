const path = require("path");
const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pptx.author = "LocateMe Team";
pptx.company = "LocateMe";
pptx.subject = "LocateMe project presentation";
pptx.title = "LocateMe - Real-Time Location Tracking Platform";
pptx.lang = "en-US";

const COLORS = {
  bg: "F7F9FC",
  navy: "0B1F3A",
  blue: "2458E6",
  teal: "0F9D9A",
  gray: "546072",
  dark: "1F2937",
  white: "FFFFFF",
  mint: "EAF8F7",
  sky: "E9F0FF",
};

function addHeader(slide, title, subtitle = "") {
  slide.background = { color: COLORS.bg };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.8,
    fill: { color: COLORS.navy },
    line: { color: COLORS.navy },
  });
  slide.addText("LocateMe", {
    x: 0.4,
    y: 0.2,
    w: 2.5,
    h: 0.3,
    fontFace: "Segoe UI",
    fontSize: 15,
    bold: true,
    color: COLORS.white,
  });
  slide.addText(title, {
    x: 0.7,
    y: 1.05,
    w: 12,
    h: 0.45,
    fontFace: "Segoe UI",
    fontSize: 30,
    bold: true,
    color: COLORS.navy,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.7,
      y: 1.55,
      w: 12,
      h: 0.35,
      fontFace: "Segoe UI",
      fontSize: 14,
      color: COLORS.gray,
    });
  }
}

function addBullets(slide, items, opts = {}) {
  const x = opts.x ?? 0.9;
  const y = opts.y ?? 2.05;
  const w = opts.w ?? 11.8;
  const h = opts.h ?? 4.8;
  const fontSize = opts.fontSize ?? 21;

  const runs = items.map((item) => ({
    text: item,
    options: { bullet: { indent: 18 }, paraSpaceAfterPt: 11 },
  }));

  slide.addText(runs, {
    x,
    y,
    w,
    h,
    fontFace: "Segoe UI",
    fontSize,
    color: COLORS.dark,
    valign: "top",
  });
}

function addScreenshotBox(slide, cfg) {
  const x = cfg.x;
  const y = cfg.y;
  const w = cfg.w;
  const h = cfg.h;
  const title = cfg.title;
  const hint = cfg.hint;

  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: "FFFFFF" },
    line: { color: "C7D5EA", pt: 1.3, dash: "dash" },
    radius: 0.04,
  });

  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h: 0.48,
    fill: { color: "EEF4FF" },
    line: { color: "C7D5EA", pt: 0.8 },
  });

  slide.addText(title, {
    x: x + 0.15,
    y: y + 0.11,
    w: w - 0.3,
    h: 0.26,
    fontFace: "Segoe UI",
    fontSize: 11,
    bold: true,
    color: COLORS.navy,
    align: "left",
  });

  slide.addText(hint, {
    x: x + 0.2,
    y: y + 0.55,
    w: w - 0.4,
    h: h - 0.8,
    fontFace: "Segoe UI",
    fontSize: 12,
    color: "6A7688",
    align: "center",
    valign: "mid",
  });
}

// 1) Title slide
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.navy };

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.65,
    y: 0.8,
    w: 12,
    h: 5.8,
    fill: { color: "112D57", transparency: 5 },
    line: { color: "2F4F84", pt: 1.2 },
    radius: 0.08,
  });

  slide.addText("LocateMe", {
    x: 1.2,
    y: 1.5,
    w: 10,
    h: 0.8,
    fontFace: "Segoe UI",
    fontSize: 52,
    bold: true,
    color: COLORS.white,
  });

  slide.addText("Real-Time Location Tracking Platform", {
    x: 1.25,
    y: 2.5,
    w: 10.5,
    h: 0.5,
    fontFace: "Segoe UI",
    fontSize: 24,
    color: "D8E4FF",
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 1.25,
    y: 3.18,
    w: 5.5,
    h: 0,
    line: { color: "7AA2FF", pt: 1.2 },
  });

  slide.addText("Project Presentation", {
    x: 1.25,
    y: 3.5,
    w: 5.8,
    h: 0.4,
    fontFace: "Segoe UI",
    fontSize: 18,
    color: "C6D7FF",
  });

  slide.addText("Tech stack: Next.js 16 • Express.js • MongoDB • Socket.IO • Mapbox", {
    x: 1.25,
    y: 4.1,
    w: 11.2,
    h: 0.7,
    fontFace: "Segoe UI",
    fontSize: 15,
    color: "E8F0FF",
  });

  slide.addText("Updated: April 2026", {
    x: 10.1,
    y: 6.75,
    w: 2.7,
    h: 0.3,
    align: "right",
    fontFace: "Segoe UI",
    fontSize: 11,
    color: "ABC2F5",
  });
}

// 2) Problem and objective
{
  const slide = pptx.addSlide();
  addHeader(
    slide,
    "Problem Statement and Objective",
    "Secure, consent-based location sharing for everyday safety and coordination.",
  );
  addBullets(slide, [
    "Many location-sharing tools are always-on, privacy-invasive, or difficult to control.",
    "LocateMe focuses on permission-first tracking through OTP verification and explicit user action.",
    "Users can request, approve, deny, or close tracking sessions with clear visibility.",
    "Goal: Deliver fast real-time updates while preserving user trust, security, and transparency.",
  ]);
}

// 3) Solution overview
{
  const slide = pptx.addSlide();
  addHeader(slide, "Solution Overview", "What LocateMe delivers today");

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 2.0,
    w: 5.95,
    h: 4.6,
    fill: { color: COLORS.sky },
    line: { color: "C9D9FF", pt: 1 },
    radius: 0.06,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.95,
    y: 2.0,
    w: 5.55,
    h: 4.6,
    fill: { color: COLORS.mint },
    line: { color: "B9E6E4", pt: 1 },
    radius: 0.06,
  });

  slide.addText("User Experience", {
    x: 1.15,
    y: 2.25,
    w: 4.8,
    h: 0.4,
    fontFace: "Segoe UI",
    fontSize: 19,
    bold: true,
    color: COLORS.navy,
  });
  addBullets(
    slide,
    [
      "Map-driven interface (Mapbox) with live coordinates and address display.",
      "Dashboard with request stats: pending, active, denied, total.",
      "Track page supports request workflow, history, and real-time mode.",
      "Settings page includes theme preferences and account summary.",
    ],
    { x: 1.1, y: 2.75, w: 5.4, h: 3.6, fontSize: 14 },
  );

  slide.addText("Core Capabilities", {
    x: 7.25,
    y: 2.25,
    w: 4.8,
    h: 0.4,
    fontFace: "Segoe UI",
    fontSize: 19,
    bold: true,
    color: "0E4D4A",
  });
  addBullets(
    slide,
    [
      "JWT-based authentication and protected API routes.",
      "OTP + deny-link flow for tracking consent.",
      "Location sharing via HTTP endpoints and Socket.IO events.",
      "History retention for latest updates and session management.",
    ],
    { x: 7.2, y: 2.75, w: 5.05, h: 3.6, fontSize: 14 },
  );
}

// 4) End-to-end flow
{
  const slide = pptx.addSlide();
  addHeader(slide, "End-to-End Tracking Flow");

  const steps = [
    "1. Requester logs in and sends tracking request to target email.",
    "2. Backend generates OTP + secure deny token and sends email.",
    "3. Target approves with OTP (or denies via app / email link).",
    "4. Tracking status changes to active and room access is enabled.",
    "5. Target shares location (GPS/IP) and requester receives updates.",
    "6. Session can be closed anytime; denied/closed states are preserved.",
  ];

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.95,
    y: 1.95,
    w: 11.5,
    h: 4.95,
    fill: { color: "FFFFFF" },
    line: { color: "D6DFEC", pt: 1 },
    radius: 0.07,
    shadow: { type: "outer", color: "D3DDEA", blur: 2, angle: 45, distance: 1 },
  });

  steps.forEach((step, i) => {
    const rowY = 2.25 + i * 0.73;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.25,
      y: rowY,
      w: 10.9,
      h: 0.58,
      fill: { color: i % 2 === 0 ? "F6F8FE" : "EEF9F8" },
      line: { color: i % 2 === 0 ? "D9E3F7" : "C8ECE9", pt: 0.5 },
      radius: 0.03,
    });
    slide.addText(step, {
      x: 1.45,
      y: rowY + 0.12,
      w: 10.5,
      h: 0.32,
      fontFace: "Segoe UI",
      fontSize: 14,
      color: COLORS.dark,
    });
  });
}

// 5) Architecture
{
  const slide = pptx.addSlide();
  addHeader(slide, "Architecture", "Modular full-stack system with API and WebSocket channels");

  const colW = 4.05;
  const colGap = 0.35;
  const startX = 0.8;
  const y = 2.0;
  const h = 4.8;

  const blocks = [
    {
      title: "Frontend (Next.js 16)",
      color: "EAF0FF",
      border: "C8D6FF",
      x: startX,
      items: [
        "AuthContext for session/token handling",
        "Pages: Home, Dashboard, Track, Settings",
        "Map component using Mapbox GL",
        "Real-time hook: useLocationTracking",
      ],
    },
    {
      title: "Backend (Express + Socket.IO)",
      color: "E9FAF8",
      border: "BEEAE6",
      x: startX + colW + colGap,
      items: [
        "REST auth and tracking routes (/api/auth/*)",
        "OTP lifecycle, deny links, status management",
        "WebSocket rooms: tracking-{email}",
        "Middleware: auth, sanitize, rate limit",
      ],
    },
    {
      title: "Data and Services",
      color: "FFF3E8",
      border: "F7DABD",
      x: startX + (colW + colGap) * 2,
      items: [
        "MongoDB with User + trackingRequests schema",
        "Location history (capped list)",
        "Nodemailer for OTP/notification delivery",
        "External geocoding + map visualization",
      ],
    },
  ];

  blocks.forEach((block) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: block.x,
      y,
      w: colW,
      h,
      fill: { color: block.color },
      line: { color: block.border, pt: 1 },
      radius: 0.06,
    });
    slide.addText(block.title, {
      x: block.x + 0.22,
      y: y + 0.2,
      w: colW - 0.35,
      h: 0.5,
      fontFace: "Segoe UI",
      fontSize: 15,
      bold: true,
      color: COLORS.navy,
    });
    addBullets(slide, block.items, {
      x: block.x + 0.16,
      y: y + 0.88,
      w: colW - 0.25,
      h: 3.75,
      fontSize: 12,
    });
  });
}

// 6) API and real-time interfaces
{
  const slide = pptx.addSlide();
  addHeader(slide, "API and Real-Time Interfaces");

  slide.addText("Key REST endpoints", {
    x: 0.9,
    y: 1.95,
    w: 5.7,
    h: 0.4,
    fontFace: "Segoe UI",
    fontSize: 18,
    bold: true,
    color: COLORS.navy,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.9,
    y: 2.35,
    w: 5.9,
    h: 4.1,
    fill: { color: "FFFFFF" },
    line: { color: "D8E1EE", pt: 1 },
    radius: 0.05,
  });

  const restList = [
    "POST /auth/register and /auth/login",
    "GET /auth/me",
    "POST /auth/send-tracking-otp",
    "POST /auth/verify-otp and /auth/deny-tracking",
    "GET /auth/tracking-status",
    "POST /auth/share-location / update-location",
    "GET /auth/tracked-user-location",
    "POST /auth/close-tracking",
  ];

  addBullets(slide, restList, { x: 1.08, y: 2.65, w: 5.5, h: 3.7, fontSize: 12 });

  slide.addText("Socket.IO events", {
    x: 7.0,
    y: 1.95,
    w: 5.0,
    h: 0.4,
    fontFace: "Segoe UI",
    fontSize: 18,
    bold: true,
    color: COLORS.navy,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 7.0,
    y: 2.35,
    w: 5.4,
    h: 4.1,
    fill: { color: "FFFFFF" },
    line: { color: "D8E1EE", pt: 1 },
    radius: 0.05,
  });

  const wsList = [
    "join-tracking-room / leave-tracking-room",
    "send-location / location-received",
    "request-location",
    "get-active-tracking",
    "ping / pong heartbeat",
    "error and connect_error handling",
  ];
  addBullets(slide, wsList, { x: 7.2, y: 2.65, w: 5.05, h: 3.7, fontSize: 12 });
}

// 7) Security and privacy
{
  const slide = pptx.addSlide();
  addHeader(slide, "Security and Privacy by Design");
  addBullets(slide, [
    "Consent-first model: tracking starts only after OTP verification by the target user.",
    "JWT-protected APIs and WebSocket auth middleware for authenticated sessions.",
    "Rate limiting and sanitization middleware reduce abuse, injection, and brute-force risk.",
    "Coordinate validation and structured error handling improve reliability and safety.",
    "Tracking sessions can be denied or closed anytime, preserving user control.",
  ]);
}

// 8) Quality and observability
{
  const slide = pptx.addSlide();
  addHeader(slide, "Testing, Reliability, and Operations");

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.95,
    y: 2.05,
    w: 11.3,
    h: 4.45,
    fill: { color: "FFFFFF" },
    line: { color: "D8E2EE", pt: 1 },
    radius: 0.05,
  });

  addBullets(
    slide,
    [
      "Automated tests (Jest): auth controller, rate-limit middleware, sanitize middleware.",
      "Health endpoint (/api/health) and structured error responses for diagnostics.",
      "CORS + Helmet + payload-size limits for baseline production hardening.",
      "WebSocket reconnection strategy with capped retry attempts.",
      "Node.js >=18 backend runtime and TypeScript-enabled frontend.",
    ],
    { x: 1.2, y: 2.35, w: 10.8, h: 3.9, fontSize: 15 },
  );
}

// 9) Current status and roadmap
{
  const slide = pptx.addSlide();
  addHeader(slide, "Current Status and Next Steps");

  slide.addText("Current implementation status", {
    x: 0.95,
    y: 1.95,
    w: 5.9,
    h: 0.4,
    fontFace: "Segoe UI",
    fontSize: 17,
    bold: true,
    color: COLORS.navy,
  });
  slide.addText("Planned enhancements", {
    x: 7.05,
    y: 1.95,
    w: 5.2,
    h: 0.4,
    fontFace: "Segoe UI",
    fontSize: 17,
    bold: true,
    color: COLORS.navy,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.9,
    y: 2.35,
    w: 5.9,
    h: 4.2,
    fill: { color: "F3F8FF" },
    line: { color: "CBDBF8", pt: 1 },
    radius: 0.05,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 7.0,
    y: 2.35,
    w: 5.3,
    h: 4.2,
    fill: { color: "EEFBF8" },
    line: { color: "BEECE5", pt: 1 },
    radius: 0.05,
  });

  addBullets(
    slide,
    [
      "Authentication, OTP flow, and core tracking workflows are functional.",
      "Real-time updates are implemented with room-based Socket.IO events.",
      "Dashboard and manager tabs expose tracking state and history.",
      "REST API documented via OpenAPI specification.",
    ],
    { x: 1.08, y: 2.68, w: 5.5, h: 3.6, fontSize: 13 },
  );

  addBullets(
    slide,
    [
      "Push notifications and mobile-oriented tracking UX.",
      "Advanced analytics and geofencing alerts.",
      "History export (CSV/PDF) and reporting views.",
      "Performance tuning and broader test coverage.",
      "Production deployment and monitoring hardening.",
    ],
    { x: 7.18, y: 2.68, w: 4.95, h: 3.6, fontSize: 13 },
  );
}

// 10) Product Demo - Core UI
{
  const slide = pptx.addSlide();
  addHeader(
    slide,
    "Product Demo Screens - Core UI",
    "Add these screenshots to quickly show the product journey.",
  );

  addScreenshotBox(slide, {
    x: 0.75,
    y: 2.0,
    w: 4.1,
    h: 4.95,
    title: "Home / Landing Page",
    hint: "Insert homepage screenshot\n(Welcome section + globe map background)",
  });

  addScreenshotBox(slide, {
    x: 4.98,
    y: 2.0,
    w: 4.1,
    h: 4.95,
    title: "Dashboard",
    hint: "Insert dashboard screenshot\n(Stats cards + quick actions)",
  });

  addScreenshotBox(slide, {
    x: 9.2,
    y: 2.0,
    w: 3.4,
    h: 4.95,
    title: "Settings",
    hint: "Insert settings screenshot\n(Theme toggle + account info)",
  });
}

// 11) Product Demo - Tracking Flow
{
  const slide = pptx.addSlide();
  addHeader(
    slide,
    "Product Demo Screens - Tracking Flow",
    "Use these to visualize OTP consent and real-time tracking.",
  );

  addScreenshotBox(slide, {
    x: 0.85,
    y: 2.0,
    w: 5.9,
    h: 2.15,
    title: "A. Send Tracking OTP",
    hint: "Track page screenshot\n(email input + Send OTP action)",
  });

  addScreenshotBox(slide, {
    x: 6.6,
    y: 2.0,
    w: 5.9,
    h: 2.15,
    title: "B. Verify / Deny OTP",
    hint: "Track page screenshot\n(OTP input + Accept/Deny buttons)",
  });

  addScreenshotBox(slide, {
    x: 0.85,
    y: 4.35,
    w: 5.9,
    h: 2.15,
    title: "C. Live Location View",
    hint: "Map screenshot\n(current location + real-time indicator)",
  });

  addScreenshotBox(slide, {
    x: 6.6,
    y: 4.35,
    w: 5.9,
    h: 2.15,
    title: "D. Tracking Manager",
    hint: "Manager screenshot\n(pending/active/history tabs)",
  });
}

// 12) Closing
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.navy };

  slide.addText("Thank You", {
    x: 0.8,
    y: 1.7,
    w: 6.5,
    h: 0.8,
    fontFace: "Segoe UI",
    fontSize: 50,
    bold: true,
    color: COLORS.white,
  });

  slide.addText("LocateMe is designed for secure, consent-driven, real-time location collaboration.", {
    x: 0.9,
    y: 2.9,
    w: 10.9,
    h: 0.8,
    fontFace: "Segoe UI",
    fontSize: 18,
    color: "D3E1FF",
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.9,
    y: 4.1,
    w: 11.4,
    h: 1.7,
    fill: { color: "103262" },
    line: { color: "2E5EA4", pt: 1 },
    radius: 0.06,
  });

  slide.addText("Questions / Demo", {
    x: 1.25,
    y: 4.55,
    w: 5.0,
    h: 0.5,
    fontFace: "Segoe UI",
    fontSize: 24,
    bold: true,
    color: COLORS.white,
  });

  slide.addText("Frontend: Next.js + Mapbox | Backend: Express + MongoDB + Socket.IO", {
    x: 1.25,
    y: 5.15,
    w: 10.5,
    h: 0.4,
    fontFace: "Segoe UI",
    fontSize: 13,
    color: "BFD5FF",
  });
}

const outputPath = path.join(process.cwd(), "LocateMe_Project_Presentation.pptx");
pptx
  .writeFile({ fileName: outputPath })
  .then(() => {
    process.stdout.write(`Presentation created: ${outputPath}\n`);
  })
  .catch((err) => {
    process.stderr.write(`Failed to create presentation: ${err.message}\n`);
    process.exit(1);
  });
