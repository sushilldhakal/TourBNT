export type Permission = string;

export interface RolePermissionMap {
    [role: string]: readonly string[];
}
