import { db } from "../prisma/db";

export async function getStudentParents(
  studentId: number,
) {
  const links = await db.orm.public.StudentParent.all();

  return links
    .filter((item) => item.studentId === studentId)
    .sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) {
        return -1;
      }

      if (!a.isPrimary && b.isPrimary) {
        return 1;
      }

      return a.id - b.id;
    });
}

export async function getParentStudents(
  parentId: number,
) {
  const links = await db.orm.public.StudentParent.all();

  return links.filter(
    (item) => item.parentId === parentId,
  );
}

export async function getStudentParentLink(
  studentId: number,
  parentId: number,
) {
  const links = await db.orm.public.StudentParent.all();

  return links.find(
    (item) =>
      item.studentId === studentId &&
      item.parentId === parentId,
  );
}

export async function linkParentToStudent(
  studentId: number,
  parentId: number,
  relationship: string,
  isPrimary: boolean,
) {
  const students = await db.orm.public.Student.all();

  const student = students.find(
    (item) => item.id === studentId,
  );

  if (!student) {
    throw new Error("Student not found.");
  }

  const parents = await db.orm.public.Parent.all();

  const parent = parents.find(
    (item) => item.id === parentId,
  );

  if (!parent) {
    throw new Error("Parent not found.");
  }

  if (student.schoolId !== parent.schoolId) {
    throw new Error(
      "Student and parent belong to different schools.",
    );
  }

  const cleanRelationship = relationship.trim();

  if (!cleanRelationship) {
    throw new Error(
      "Relationship is required.",
    );
  }

  const links = await db.orm.public.StudentParent.all();

  const existing = links.find(
    (item) =>
      item.studentId === studentId &&
      item.parentId === parentId,
  );

  if (existing) {
    throw new Error(
      "This parent is already linked to this student.",
    );
  }

  if (isPrimary) {
    const existingPrimaryLinks = links.filter(
      (item) =>
        item.studentId === studentId &&
        item.isPrimary === true,
    );

    for (const link of existingPrimaryLinks) {
      await db.orm.public.StudentParent.where({
        id: link.id,
      }).update({
        isPrimary: false,
      });
    }
  }

  return db.orm.public.StudentParent.create({
    studentId,
    parentId,
    relationship: cleanRelationship,
    isPrimary,
  });
}

export async function updateStudentParentLink(
  linkId: number,
  relationship: string,
  isPrimary: boolean,
) {
  const links = await db.orm.public.StudentParent.all();

  const existing = links.find(
    (item) => item.id === linkId,
  );

  if (!existing) {
    throw new Error(
      "Student-parent link not found.",
    );
  }

  const cleanRelationship = relationship.trim();

  if (!cleanRelationship) {
    throw new Error(
      "Relationship is required.",
    );
  }

  if (isPrimary) {
    const existingPrimaryLinks = links.filter(
      (item) =>
        item.studentId === existing.studentId &&
        item.isPrimary === true &&
        item.id !== existing.id,
    );

    for (const link of existingPrimaryLinks) {
      await db.orm.public.StudentParent.where({
        id: link.id,
      }).update({
        isPrimary: false,
      });
    }
  }

  return db.orm.public.StudentParent.where({
    id: existing.id,
  }).update({
    relationship: cleanRelationship,
    isPrimary,
  });
}

export async function unlinkParentFromStudent(
  linkId: number,
) {
  const links = await db.orm.public.StudentParent.all();

  const existing = links.find(
    (item) => item.id === linkId,
  );

  if (!existing) {
    throw new Error(
      "Student-parent link not found.",
    );
  }

  await db.orm.public.StudentParent.where({
    id: existing.id,
  }).delete();

  return true;
}