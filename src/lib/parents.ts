import { db } from "../prisma/db";

export async function getParents(schoolId: number) {
  const parents = await db.orm.public.Parent.all();

  return parents
    .filter((parent) => parent.schoolId === schoolId)
    .sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);

      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }

      return a.firstName.localeCompare(b.firstName);
    });
}

export async function getParentById(
  parentId: number,
  schoolId: number,
) {
  const parents = await db.orm.public.Parent.all();

  return parents.find(
    (parent) =>
      parent.id === parentId &&
      parent.schoolId === schoolId,
  );
}

export async function getParentByPermanentId(
  permanentId: string,
  schoolId: number,
) {
  const parents = await db.orm.public.Parent.all();

  return parents.find(
    (parent) =>
      parent.permanentId === permanentId &&
      parent.schoolId === schoolId,
  );
}

export async function searchParents(
  schoolId: number,
  search: string,
) {
  const parents = await getParents(schoolId);

  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return parents;
  }

  return parents.filter((parent) => {
    const fullName = [
      parent.firstName,
      parent.middleName,
      parent.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      fullName.includes(normalizedSearch) ||
      parent.permanentId
        .toLowerCase()
        .includes(normalizedSearch) ||
      parent.phone
        ?.toLowerCase()
        .includes(normalizedSearch) ||
      parent.email
        ?.toLowerCase()
        .includes(normalizedSearch)
    );
  });
}

export async function getActiveParents(
  schoolId: number,
) {
  const parents = await getParents(schoolId);

  return parents.filter(
    (parent) => parent.status === "ACTIVE",
  );
}