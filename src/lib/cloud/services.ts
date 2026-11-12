import { Box, ClipboardCopy, Cloud, Download, HardDrive, Link2, Mail, MessageSquare, Sheet, type LucideIcon } from "lucide-react";

export type DestinationId = "download" | "clipboard" | "share" | "email" | "gsheets" | "gdrive" | "dropbox" | "onedrive" | "slack";

export interface Service {
  id: DestinationId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  /** Brand-ish tint for the tile (generic icon, no third-party logos). */
  tint: string;
  group: "local" | "share" | "cloud" | "apps";
  /** Needs an (OAuth-style) account connection first. */
  requiresConnection: boolean;
  /** True = demo flow only; nothing leaves the browser. */
  simulated: boolean;
  /** Labels shown as a background job progresses. */
  steps: string[];
  /** Can be the target of a recurring scheduled export. */
  schedulable: boolean;
  scopes?: string[];
}

export const SERVICES: Record<DestinationId, Service> = {
  download: {
    id: "download",
    name: "Download",
    tagline: "Save the file to this device",
    icon: Download,
    tint: "bg-slate-100 text-slate-700",
    group: "local",
    requiresConnection: false,
    simulated: false,
    steps: ["Generating file", "Downloaded"],
    schedulable: false,
  },
  clipboard: {
    id: "clipboard",
    name: "Copy as table",
    tagline: "Paste into Sheets, Excel, Notion",
    icon: ClipboardCopy,
    tint: "bg-violet-50 text-violet-700",
    group: "local",
    requiresConnection: false,
    simulated: false,
    steps: ["Formatting table", "Copied to clipboard"],
    schedulable: false,
  },
  share: {
    id: "share",
    name: "Share link",
    tagline: "Private link + QR, optional password",
    icon: Link2,
    tint: "bg-brand-50 text-brand-700",
    group: "share",
    requiresConnection: false,
    simulated: false,
    steps: ["Compressing snapshot", "Encrypting", "Link ready"],
    schedulable: false,
  },
  email: {
    id: "email",
    name: "Email",
    tagline: "Send the report to anyone",
    icon: Mail,
    tint: "bg-rose-50 text-rose-700",
    group: "share",
    requiresConnection: false,
    simulated: true,
    steps: ["Preparing attachment", "Rendering email", "Sending", "Delivered"],
    schedulable: true,
  },
  gsheets: {
    id: "gsheets",
    name: "Google Sheets",
    tagline: "Create or update a live spreadsheet",
    icon: Sheet,
    tint: "bg-green-50 text-green-700",
    group: "apps",
    requiresConnection: true,
    simulated: true,
    steps: ["Preparing rows", "Creating spreadsheet", "Writing cells", "Applying formatting", "Synced"],
    schedulable: true,
    scopes: ["Create spreadsheets in your Drive", "Edit spreadsheets created by Spendwise"],
  },
  gdrive: {
    id: "gdrive",
    name: "Google Drive",
    tagline: "Upload files to a Drive folder",
    icon: HardDrive,
    tint: "bg-amber-50 text-amber-700",
    group: "cloud",
    requiresConnection: true,
    simulated: true,
    steps: ["Generating file", "Uploading", "Verifying checksum", "Uploaded"],
    schedulable: true,
    scopes: ["See and upload files Spendwise creates"],
  },
  dropbox: {
    id: "dropbox",
    name: "Dropbox",
    tagline: "Back up to /Apps/Spendwise",
    icon: Box,
    tint: "bg-sky-50 text-sky-700",
    group: "cloud",
    requiresConnection: true,
    simulated: true,
    steps: ["Generating file", "Uploading", "Verifying checksum", "Uploaded"],
    schedulable: true,
    scopes: ["Read & write files in Apps/Spendwise"],
  },
  onedrive: {
    id: "onedrive",
    name: "OneDrive",
    tagline: "Sync to your Microsoft account",
    icon: Cloud,
    tint: "bg-blue-50 text-blue-700",
    group: "cloud",
    requiresConnection: true,
    simulated: true,
    steps: ["Generating file", "Uploading", "Verifying checksum", "Uploaded"],
    schedulable: true,
    scopes: ["Read & write files in your app folder"],
  },
  slack: {
    id: "slack",
    name: "Slack",
    tagline: "Post a spending digest to a channel",
    icon: MessageSquare,
    tint: "bg-fuchsia-50 text-fuchsia-700",
    group: "apps",
    requiresConnection: true,
    simulated: true,
    steps: ["Summarising", "Formatting message", "Posting", "Posted"],
    schedulable: true,
    scopes: ["Post messages to channels you choose"],
  },
};

export const CONNECTABLE: DestinationId[] = ["gsheets", "gdrive", "dropbox", "onedrive", "slack"];
