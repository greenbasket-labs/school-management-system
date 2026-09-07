import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../src/lib/current-user";
import { hasPermission } from "../../../src/lib/permissions";
import { getSchool } from "../../../src/lib/school";
import {
  getSchoolFeatures,
  updateFeature,
} from "../../../src/lib/features";

async function toggleFeatureAction(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const allowed = await hasPermission(
    currentUser.id,
    "school.edit",
  );

  if (!allowed) {
    throw new Error(
      "Permission denied: school.edit",
    );
  }

  const featureId = Number(
    formData.get("featureId"),
  );

  const enabled =
    formData.get("enabled") === "true";

  if (!Number.isInteger(featureId) || featureId <= 0) {
    throw new Error("Invalid feature.");
  }

  await updateFeature(featureId, enabled);

  redirect("/settings/features");
}

function FeatureCard({
  feature,
  locked = false,
}: {
  feature: {
    id: number;
    name: string;
    description: string | null;
    enabled: boolean;
    isCore: boolean;
  };
  locked?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h3 className="font-semibold text-slate-900">
            {feature.name}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {feature.description}
          </p>
        </div>

        {locked ? (
          <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Coming Soon
          </span>
        ) : feature.isCore ? (
          <span className="whitespace-nowrap rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            Core
          </span>
        ) : (
          <form action={toggleFeatureAction}>
            <input
              type="hidden"
              name="featureId"
              value={feature.id}
            />

            <input
              type="hidden"
              name="enabled"
              value={
                feature.enabled
                  ? "false"
                  : "true"
              }
            />

            <button
              type="submit"
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${
                feature.enabled
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {feature.enabled
                ? "Enabled"
                : "Enable"}
            </button>
          </form>
        )}
      </div>

      {feature.isCore && (
        <p className="mt-5 text-xs font-medium text-green-600">
          Always available
        </p>
      )}
    </div>
  );
}

export default async function FeaturesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const allowed = await hasPermission(
    currentUser.id,
    "school.view",
  );

  if (!allowed) {
    throw new Error(
      "Permission denied: school.view",
    );
  }

  const canEdit = await hasPermission(
    currentUser.id,
    "school.edit",
  );

  const school = await getSchool();
  const features = await getSchoolFeatures();

  const core = features.filter(
    (feature) =>
      feature.category === "CORE",
  );

  const optional = features.filter(
    (feature) =>
      feature.category === "OPTIONAL",
  );

  const future = features.filter(
    (feature) =>
      feature.category === "FUTURE",
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school?.name ??
                "School Management System"}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Feature Marketplace
            </h1>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-blue-600">
            School Configuration
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Control your school modules
          </h2>

          <p className="mt-3 max-w-3xl text-slate-500">
            Core modules are included automatically.
            Optional modules can be enabled when your
            school needs them. Future modules are shown
            here so you can see what is coming.
          </p>
        </div>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Core Features
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Essential school management features
              included in every school.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {core.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
              />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Optional Features
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enable these modules when the school
              is ready to use them.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {optional.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                locked={!canEdit}
              />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Coming Soon
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Future modules planned for the platform.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {future.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                locked
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}