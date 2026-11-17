import { clerkClient } from "@clerk/express";
import User from "../models/User.js";
import Student from "../models/Student.js";

// =====================================================
// CHANGE A LOGIN EMAIL (admin only)
//
// The email is the Clerk sign-in identifier and is also
// kept in MongoDB (User, and Student for a student).
// All of them must change together:
//
//   const change = await prepareEmailChange({...});
//   ...save MongoDB...
//   await change.finish();      // after MongoDB saved
//   await change.rollback();    // if MongoDB failed
//
// prepareEmailChange:
// 1. checks the format and that no other User, Student
//    or Clerk account has the new email
// 2. adds the new email to the Clerk account, verified
//    and primary, so the person signs in with it at once
// finish() removes the old email from Clerk, so it can
// no longer be used to sign in.
// rollback() puts the old email back as primary and
// removes the new one.
// =====================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export class EmailChangeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Clerk errors carry the useful text in errors[0]
const clerkMessage = (error) =>
  error?.errors?.[0]?.longMessage ||
  error?.errors?.[0]?.message ||
  error?.message ||
  "Clerk could not update the email.";

export const prepareEmailChange = async ({
  clerkId,
  newEmail,
  userId = null,
  studentId = null,
}) => {
  const email = normalizeEmail(newEmail);

  if (!EMAIL_PATTERN.test(email)) {
    throw new EmailChangeError("Enter a valid email address.");
  }

  if (!clerkId) {
    throw new EmailChangeError(
      "This account has no Clerk login, so its email cannot be changed here."
    );
  }

  // ---------------- MongoDB ----------------
  const otherUser = await User.findOne({
    email,
    clerkId: { $ne: clerkId },
    ...(userId ? { _id: { $ne: userId } } : {}),
  })
    .select("_id")
    .lean();

  const otherStudent = await Student.findOne({
    email,
    clerkId: { $ne: clerkId },
    ...(studentId ? { _id: { $ne: studentId } } : {}),
  })
    .select("_id")
    .lean();

  if (otherUser || otherStudent) {
    throw new EmailChangeError(
      "This email is already used by another account.",
      409
    );
  }

  // ---------------- Clerk ----------------
  let clerkUser;

  try {
    clerkUser = await clerkClient.users.getUser(clerkId);
  } catch (error) {
    throw new EmailChangeError(
      `Clerk login not found: ${clerkMessage(error)}`,
      404
    );
  }

  const others = await clerkClient.users.getUserList({
    emailAddress: [email],
  });

  const otherList = Array.isArray(others) ? others : others?.data || [];

  if (otherList.some((other) => other.id !== clerkId)) {
    throw new EmailChangeError(
      "Another login already uses this email.",
      409
    );
  }

  const previousPrimaryId = clerkUser.primaryEmailAddressId;

  const existing = (clerkUser.emailAddresses || []).find(
    (address) => normalizeEmail(address.emailAddress) === email
  );

  let newAddressId;
  let created = false;

  try {
    if (existing) {
      await clerkClient.emailAddresses.updateEmailAddress(existing.id, {
        verified: true,
        primary: true,
      });

      newAddressId = existing.id;
    } else {
      const address =
        await clerkClient.emailAddresses.createEmailAddress({
          userId: clerkId,
          emailAddress: email,
          verified: true,
          primary: true,
        });

      newAddressId = address.id;
      created = true;
    }
  } catch (error) {
    throw new EmailChangeError(clerkMessage(error));
  }

  return {
    email,

    // Old emails can no longer be used to sign in
    finish: async () => {
      for (const address of clerkUser.emailAddresses || []) {
        if (address.id === newAddressId) {
          continue;
        }

        try {
          await clerkClient.emailAddresses.deleteEmailAddress(address.id);
        } catch (error) {
          console.error(
            "Old email could not be removed from Clerk:",
            clerkMessage(error)
          );
        }
      }
    },

    // MongoDB failed: Clerk goes back as it was
    rollback: async () => {
      try {
        if (previousPrimaryId && previousPrimaryId !== newAddressId) {
          await clerkClient.emailAddresses.updateEmailAddress(
            previousPrimaryId,
            { primary: true }
          );
        }

        if (created) {
          await clerkClient.emailAddresses.deleteEmailAddress(newAddressId);
        }
      } catch (error) {
        console.error(
          "Clerk email change could not be undone:",
          clerkMessage(error)
        );
      }
    },
  };
};
