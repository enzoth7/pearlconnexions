import { z } from "zod";

const webUrl = z.string().trim().max(2048).pipe(z.url("Enter a full web address, starting with https://")).refine(value => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Use an http or https address without sign-in details.").transform(value => new URL(value).href);

export const workspaceLinksSchema = z.object({
  dashboard_url: webUrl,
  website_url: webUrl,
});

export type WorkspaceLinks = z.infer<typeof workspaceLinksSchema>;
export type WorkspaceLinksState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  links?: WorkspaceLinks;
};
