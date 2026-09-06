import { db } from "../prisma/db";

export async function getSchoolFeatures() {
  const schools = await db.orm.public.School.all();

  if (schools.length === 0) {
    throw new Error("School not found");
  }

  const features = await db.orm.public.SchoolFeature.all();

  return features
    .filter((feature) => feature.schoolId === schools[0].id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function updateFeature(
  featureId: number,
  enabled: boolean,
) {
  const features = await db.orm.public.SchoolFeature.all();

  const feature = features.find(
    (item) => item.id === featureId,
  );

  if (!feature) {
    throw new Error("Feature not found");
  }

  if (feature.isCore) {
    throw new Error("Core features cannot be disabled");
  }

  if (feature.status !== "AVAILABLE") {
    throw new Error("This feature is not currently available");
  }

  await db.orm.public.SchoolFeature
    .where({ id: featureId })
    .update({
      enabled,
    });

  return true;
}