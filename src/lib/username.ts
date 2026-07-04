/** 用户名统一为小写存储与比对；密码保持原始大小写 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
