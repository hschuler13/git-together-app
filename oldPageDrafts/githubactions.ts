import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g., smtp.gmail.com
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Replace with your 10 repos
const REPOS = [
  "owner1/repo1",
  "owner2/repo2",
  // ...
];

async function fetchStoredIssues() {
  const { data, error } = await supabase.from("issues").select("*");
  if (error) throw error;
  return data || [];
}

async function fetchUsers() {
  const { data, error } = await supabase.from("users").select("*");
  if (error) throw error;
  return data || [];
}

async function fetchGitHubIssues() {
  const allIssues = [];
  
  for (const repo of REPOS) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo}/issues?labels=good first issue&state=open`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            // Add token if you have one to avoid rate limits
            ...(process.env.GITHUB_TOKEN && {
              Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            }),
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch issues for ${repo}:`, response.status);
        continue;
      }

      const issues = await response.json();
      
      // Transform to our format
      const formattedIssues = issues.map((issue) => ({
        id: issue.id,
        title: issue.title,
        url: issue.html_url,
        repo: repo,
        number: issue.number,
        created_at: issue.created_at,
      }));

      allIssues.push(...formattedIssues);
    } catch (error) {
      console.error(`Error fetching issues for ${repo}:`, error);
    }
  }

  return allIssues;
}

function detectChanges(oldIssues, newIssues) {
  const oldMap = new Map(oldIssues.map((i) => [i.id, i]));
  const newMap = new Map(newIssues.map((i) => [i.id, i]));

  const added = newIssues.filter((i) => !oldMap.has(i.id));
  const removed = oldIssues.filter((i) => !newMap.has(i.id));

  return {
    added,
    removed,
    hasChanges: added.length > 0 || removed.length > 0,
  };
}

async function updateStoredIssues(newIssues) {
  // Delete all existing issues
  await supabase.from("issues").delete().neq("id", 0);
  
  // Insert new issues
  if (newIssues.length > 0) {
    const { error } = await supabase.from("issues").insert(newIssues);
    if (error) console.error("Error updating issues:", error);
  }
}

async function sendEmail(to, addedIssues, removedIssues) {
  const mailOptions = {
    from: `"Your App" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: to,
    subject: "Daily Update: New Good First Issues!",
    html: `
      <h2>New Issue Changes Detected</h2>
      ${
        addedIssues.length > 0
          ? `
        <p><strong>New issues added:</strong></p>
        <ul>
          ${addedIssues
            .map(
              (i) =>
                `<li><a href="${i.url}">${i.title}</a> (${i.repo})</li>`
            )
            .join("")}
        </ul>
      `
          : ""
      }
      ${
        removedIssues.length > 0
          ? `
        <p><strong>Issues removed:</strong></p>
        <ul>
          ${removedIssues
            .map(
              (i) =>
                `<li>${i.title} (${i.repo})</li>`
            )
            .join("")}
        </ul>
      `
          : ""
      }
      <p>You are receiving this because emailNotifications = true.</p>
      <p><a href="https://yourdomain.com/settings">Manage your notification preferences</a></p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

async function main() {
  console.log("Starting daily issue check...");

  const stored = await fetchStoredIssues();
  const users = await fetchUsers();
  const fresh = await fetchGitHubIssues();

  console.log(`Found ${fresh.length} current issues`);
  console.log(`Had ${stored.length} stored issues`);

  const { added, removed, hasChanges } = detectChanges(stored, fresh);

  console.log("Changes found?", hasChanges);
  console.log(`Added: ${added.length}, Removed: ${removed.length}`);

  if (hasChanges) {
    // Update DB with fresh issues
    await updateStoredIssues(fresh);
    console.log("Database updated with fresh issues");
  }

  // Notify only users with emailNotifications = true
  const notifiedUsers = users.filter((u) => u.emailNotifications === true);
  console.log(`Found ${notifiedUsers.length} users with notifications enabled`);

  if (hasChanges && notifiedUsers.length > 0) {
    for (const user of notifiedUsers) {
      try {
        await sendEmail(user.email, added, removed);
        console.log(`Sent email → ${user.email}`);
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
      }
    }
  } else if (!hasChanges) {
    console.log("No changes detected, skipping email notifications");
  } else if (notifiedUsers.length === 0) {
    console.log("No users with notifications enabled");
  }

  console.log("Process finished.");
}

main().catch((err) => {
  console.error("Error in dailyIssues.js:", err);
  process.exit(1);
});