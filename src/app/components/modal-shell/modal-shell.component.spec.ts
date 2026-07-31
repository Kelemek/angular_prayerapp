import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModalShellComponent } from "./modal-shell.component";

describe("ModalShellComponent", () => {
  let component: ModalShellComponent;

  beforeEach(() => {
    component = new ModalShellComponent();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("onBackdropClick emits close when clicking overlay", () => {
    const spy = vi.spyOn(component.close, "emit");
    const overlay = document.createElement("div");

    component.onBackdropClick({
      target: overlay,
      currentTarget: overlay,
    } as unknown as MouseEvent);

    expect(spy).toHaveBeenCalled();
  });

  it("onBackdropClick does not emit close when clicking inner panel", () => {
    const spy = vi.spyOn(component.close, "emit");
    const overlay = document.createElement("div");
    const panel = document.createElement("div");

    component.onBackdropClick({
      target: panel,
      currentTarget: overlay,
    } as unknown as MouseEvent);

    expect(spy).not.toHaveBeenCalled();
  });
});
