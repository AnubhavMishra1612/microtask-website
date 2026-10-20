---
name: ui-ux-design
description: Implements responsive, mobile-first UI/UX design, accessibility standards, reusable UI components, and clean admin dashboard layouts. Use when designing or styling pages, forms, cards, and modals.
---

# UI/UX Design Guidelines

## Core Principles
- **Mobile-First Layout:** Default styles must target mobile viewports first (e.g., 360px–420px widths common in India), scaling smoothly to tablets and desktop.
- **Visual Hierarchy & Clarity:** Clearly highlight task titles, reward badges in INR (`₹`), deadlines, and submission action buttons.
- **Genuine Feedback & States:** Always provide immediate feedback states: loading spinners, disabled buttons during submit, descriptive empty states, and toast/banner alerts. Never use fake counters or fabricated worker activity.

## Reusable Components
- **Task Cards:** Display title, status badge (`ACTIVE`, `PAUSED`), proof type pill, reward formatted in INR via `formatINR()`, and deadline countdown.
- **Form Controls:** Provide visible labels, clear helper text, accessible error messages below fields, and touch targets of at least 44x44px.
- **Floating Telegram Widget:** Fixed bottom-right action button with clear icon and tooltip. Handles unconfigured or disabled states gracefully without breaking layout.
- **Review Modals:** Clean side-by-side or stacked preview for proof text and screenshot images with zoom or full-view capabilities.

## Accessibility (a11y)
- Maintain WCAG AA contrast ratio (minimum 4.5:1 for normal text).
- Include `aria-label` attributes on icon-only buttons (e.g., copy buttons, close buttons).
- Ensure full keyboard navigation support for modals, dropdowns, and submission forms.
- Use native semantic HTML elements (`<main>`, `<header>`, `<nav>`, `<article>`, `<button>`).
