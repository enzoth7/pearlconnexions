// @vitest-environment jsdom
import { useActionState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { preserveSubmittedForms } from "./shims/preserve-forms";

function FailingForm() {
  const [state, action] = useActionState(async () => ({ message: "Save failed" }), { message: "" });
  return <form action={action}>
    <input aria-label="Name" name="name" defaultValue="" />
    <button type="submit">Save</button>
    {state.message && <p>{state.message}</p>}
  </form>;
}

test("failed React form action preserves the entered value", async () => {
  const stopPreserving = preserveSubmittedForms(document);
  render(<FailingForm />);
  const field = screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
  fireEvent.change(field, { target: { value: "Unsaved name" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(screen.getByText("Save failed")).toBeTruthy());
  expect(field.value).toBe("Unsaved name");
  stopPreserving();
});
