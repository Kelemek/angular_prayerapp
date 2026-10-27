import { describe, it, expect, vi, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { HomeAddChoiceModalComponent } from "./home-add-choice-modal.component";
import type { HomeAddChoiceOption } from "./home-add-choice-modal.component";
import {
  modalShellOverlayRoot,
  modalShellOverlayText,
  modalShellQuery,
  modalShellQueryAll,
} from "../modal-shell/modal-shell-test-dom";
import { resetModalShellScrollLockForTests } from "../modal-shell/modal-shell-scroll-lock";

const personalOptions: readonly HomeAddChoiceOption[] = [
  {
    id: "prayer",
    label: "New prayer",
    description: "Private prayer, only you see it",
  },
  {
    id: "category",
    label: "New category",
    description: "A label for prayers only you see",
  },
];

function choiceButton(label: string): HTMLButtonElement {
  const match = modalShellQueryAll<HTMLButtonElement>("button").find((button) =>
    button.textContent?.includes(label)
  );
  if (!match) {
    throw new Error(`missing choice ${label}`);
  }
  return match;
}

describe("HomeAddChoiceModalComponent", () => {
  afterEach(() => {
    resetModalShellScrollLockForTests();
    document.body.style.overflow = "";
  });

  it("renders nothing while closed", () => {
    const fixture = TestBed.createComponent(HomeAddChoiceModalComponent);
    fixture.componentInstance.isOpen = false;
    fixture.componentInstance.title = "Add to Personal";
    fixture.componentInstance.options = personalOptions;
    fixture.detectChanges();
    expect(modalShellOverlayRoot()).toBeNull();
    fixture.destroy();
  });

  it("renders the options and emits the chosen id", () => {
    const fixture = TestBed.createComponent(HomeAddChoiceModalComponent);
    const choose = vi.fn();
    fixture.componentInstance.choose.subscribe(choose);
    fixture.componentInstance.isOpen = true;
    fixture.componentInstance.title = "Add to Personal";
    fixture.componentInstance.options = personalOptions;
    fixture.detectChanges();

    expect(modalShellOverlayText()).toContain("Add to Personal");
    expect(modalShellOverlayText()).toContain("New prayer");
    expect(modalShellOverlayText()).toContain("Private prayer, only you see it");
    expect(modalShellOverlayText()).toContain("New category");

    choiceButton("New prayer").click();
    expect(choose).toHaveBeenCalledWith("prayer");
    fixture.destroy();
  });

  it("does not emit a disabled option and shows its hint", () => {
    const fixture = TestBed.createComponent(HomeAddChoiceModalComponent);
    const choose = vi.fn();
    fixture.componentInstance.choose.subscribe(choose);
    fixture.componentInstance.isOpen = true;
    fixture.componentInstance.title = "Add to Groups";
    fixture.componentInstance.options = [
      {
        id: "prayer",
        label: "New prayer",
        description: "Share with a group",
        disabled: true,
        hint: "Create a group first",
      },
      {
        id: "group",
        label: "New group",
        description: "Invite people to pray together",
      },
    ];
    fixture.detectChanges();

    const prayer = choiceButton("New prayer");
    expect(prayer.disabled).toBe(true);
    expect(prayer.textContent).toContain("Create a group first");
    prayer.click();
    expect(choose).not.toHaveBeenCalled();

    choiceButton("New group").click();
    expect(choose).toHaveBeenCalledTimes(1);
    expect(choose).toHaveBeenCalledWith("group");
    fixture.destroy();
  });

  it("emits close from the dialog close button", () => {
    const fixture = TestBed.createComponent(HomeAddChoiceModalComponent);
    const close = vi.fn();
    fixture.componentInstance.close.subscribe(close);
    fixture.componentInstance.isOpen = true;
    fixture.componentInstance.title = "Add to Personal";
    fixture.componentInstance.options = personalOptions;
    fixture.detectChanges();

    modalShellQuery<HTMLButtonElement>('[aria-label="Close"]')?.click();
    expect(close).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });
});
