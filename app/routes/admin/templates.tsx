import { useState } from "react";
import { Link } from "react-router";
import { TrailButton } from "@/app/components/buttons";
import type { Route } from "../../../.react-router/types/app/routes/admin/+types/templates";
import type { MetaFunction } from "react-router";
import { ComingSoon } from "@/app/components/coming-soon";

export const meta: MetaFunction = () => {
  return [
    { title: "Print Templates - Trail Counter" },
    { name: "description", content: "Manage print templates for trail QR codes" },
  ];
}

export async function clientLoader({
  context,
}: Route.ClientLoaderArgs) {
  return {};
}

export default function TemplatesAdmin() {
  return (
    <ComingSoon 
      featureName="Print Templates"
      description="The templates feature will allow you to create and manage custom QR code print layouts for your trails. This functionality is currently under development."
    />
  );
}