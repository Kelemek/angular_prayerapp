import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isInsideCdkVirtualScrollContent,
  portalPrayerCardModalsHostToBody,
  prayerCardModalsStackHasOpenModal,
  restorePrayerCardModalsHostFromBody,
} from "./prayer-card-modals-portal";

describe("prayerCardModalsStackHasOpenModal", () => {
  it("returns true when any modal flag is open", () => {
    expect(
      prayerCardModalsStackHasOpenModal({
        showAddUpdateForm: true,
        showDeleteRequestForm: false,
        showUpdateDeleteRequestForm: null,
        showConfirmationDialog: false,
        showUpdateConfirmationDialog: false,
        personalAnsweredStatusModalMode: null,
        showReminderModal: false,
        showPrayForModal: false,
      })
    ).toBe(true);
  });

  it("returns false when all modal flags are closed", () => {
    expect(
      prayerCardModalsStackHasOpenModal({
        showAddUpdateForm: false,
        showDeleteRequestForm: false,
        showUpdateDeleteRequestForm: null,
        showConfirmationDialog: false,
        showUpdateConfirmationDialog: false,
        personalAnsweredStatusModalMode: null,
        showReminderModal: false,
        showPrayForModal: false,
      })
    ).toBe(false);
  });
});

describe("prayer card modals body portal", () => {
  let host: HTMLElement;
  let parent: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    parent = document.createElement("div");
    host = document.createElement("app-prayer-card-modals-stack");
    parent.appendChild(host);
    document.body.appendChild(parent);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("detects virtual scroll content wrapper ancestors", () => {
    const wrapper = document.createElement("div");
    wrapper.className = "cdk-virtual-scroll-content-wrapper";
    document.body.innerHTML = "";
    wrapper.appendChild(host);
    document.body.appendChild(wrapper);

    expect(isInsideCdkVirtualScrollContent(host)).toBe(true);
  });

  it("portals the host to document.body and restores it", () => {
    const anchor = portalPrayerCardModalsHostToBody(host, null);

    expect(host.parentElement).toBe(document.body);
    expect(anchor.parent).toBe(parent);

    restorePrayerCardModalsHostFromBody(host, anchor);

    expect(host.parentElement).toBe(parent);
  });
});
