# Permissions

1.6.0 completes the existing public/private, owner, administrator, and visitor rules. It does not add configurable permission matrices or another admin page. Widgets inherit their board's access rules.

## Who can do what

| Action | Signed out | Other signed-in user | Board owner | Administrator |
|---|---|---|---|---|
| Read a public board and its widgets | Yes | Yes | Yes | Yes |
| Read a private board and its widgets | No | No | Yes | Yes |
| Load the editor or read insights, even for a public board | No | No | Yes | Yes |
| Change board details, appearance, visibility, or widgets | No | No | Yes | Yes |
| Delete a board | No | No | Yes, with safeguards | Yes, with safeguards |
| Record a view or link click | Public boards | Public boards | Own readable boards | Any readable board |

- Creating boards, listing `/mine`, and changing a profile or preferences require a session and operate on the current account. Administrator access to other boards does not grant access to another user's personal preferences.
- A public main board is optional. Every user, including administrators, can select only a public board they own. Without a selection, `/{username}` shows a minimal profile.
- Deletion keeps at least one board per owner and rejects a board still selected as main. Archived system-route mappings no longer block deletion.
- Link clicks require an enabled Link widget belonging to the supplied board. A public board does not make its editor snapshot or analytics public.
- Public board lists exclude private boards for everyone. `/mine` lists only the signed-in user's boards; it is not an administrator's all-board browser.

## Server enforcement

Controllers declare an `@ApiAccess` policy. `ApiAuthorizationInterceptor` checks the handler Spring matched and its resolved path variables, rather than guessing from raw URL text. A new application handler without a policy is denied by default; framework routes and CORS preflight retain their normal behavior.

`BoardAccessService` shares the owner/admin predicate across reads, writes, and `canEdit`. Board routes resolve slugs; insights resolve stable database IDs. Event endpoints check the board ID from their validated request body before recording anything.

- Unauthorized protected reads return **404**, including editor and insights reads, so private resources are not disclosed.
- Writes require a valid session (**401** otherwise); a signed-in non-owner/non-admin receives **403**.
- Public reads still work with an absent or expired session. Expired or revoked sessions do not grant private access.
- Retired APIs return **410** and cannot mutate archived data.

## Frontend behavior

Editing controls depend on the server's `canEdit` result. Account or board changes clear old permission state while fresh requests resolve; errors leave editing disabled. The public `/{username}` profile remains a read-only presentation even for its owner; use `/{username}/{slug}` to edit.

Board libraries, insights, and account stores clear data and cancel obsolete loads when the account changes or signs out. Profile forms discard queued autosaves and pending responses from the previous account. Bearer tokens are attached only to recognized same-origin API routes. These UI rules support the server checks; they do not replace them.

No migration or new role storage is needed for 1.6.0. See [API reference](API-Reference) for endpoints and [Testing](Testing) for verification.
