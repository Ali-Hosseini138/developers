export function buildAppReviewSnapshot(row: Record<string, any>) {
  return {
    name: row.name ?? null,
    tagline: row.tagline ?? null,
    description: row.description ?? null,
    category: row.category ?? null,
    age_restriction: row.age_restriction ?? null,
    package_name: row.package_name ?? null,
    website: row.website ?? null,
    support_email: row.support_email ?? null,
    apk_path: row.apk_path ?? null,
    apk_name: row.apk_name ?? null,
    apk_size: row.apk_size ?? null,
    icon_path: row.icon_path ?? null,
    banner_path: row.banner_path ?? null,
    screenshot_paths: row.screenshot_paths ?? [],
    has_in_app_payment: Boolean(row.has_in_app_payment),
    netbox_payment_integrated: Boolean(row.netbox_payment_integrated),
    developed_for_android_tv: row.developed_for_android_tv !== false,
    air_mouse_compatible: Boolean(row.air_mouse_compatible),
  }
}

export function buildVersionReviewSnapshot(row: Record<string, any>) {
  return {
    package_name: row.package_name ?? null,
    apk_path: row.apk_path ?? null,
    apk_name: row.apk_name ?? null,
    apk_size: row.apk_size ?? null,
    changelog: row.changelog ?? null,
  }
}
