import json
import os

EN_FILE = "en/translation.json"
AR_FILE = "ar/translation.json"

with open(EN_FILE, "r", encoding="utf-8") as f:
    en = json.load(f)
with open(AR_FILE, "r", encoding="utf-8") as f:
    ar = json.load(f)

# Drive additions
en_drive_additions = {
    "trashNotice": "Files in trash are permanently deleted after 30 days.",
    "noTrash": "Trash is empty.",
    "allFiles": "All files",
    "documents": "Documents",
    "images": "Images",
    "videos": "Videos",
    "audio": "Audio",
    "archives": "Archives",
    "other": "Other",
    "nameAZ": "Name (A-Z)",
    "nameZA": "Name (Z-A)",
    "dateNewest": "Modified (Newest)",
    "dateOldest": "Modified (Oldest)",
    "sizeLargest": "Size (Largest)",
    "sizeSmallest": "Size (Smallest)",
    "selected": "selected",
    "noShared": "No files or folders have been shared with you.",
    "folders": "Folders",
    "files": "Files",
    "noStarred": "No starred files yet.",
    "noRecent": "No recently accessed files.",
    "noSearchResults": "No results for",
}

ar_drive_additions = {
    "trashNotice": "يتم حذف الملفات الموجودة في سلة المهملات نهائيًا بعد 30 يومًا.",
    "noTrash": "سلة المهملات فارغة.",
    "allFiles": "جميع الملفات",
    "documents": "مستندات",
    "images": "صور",
    "videos": "فيديوهات",
    "audio": "صوتيات",
    "archives": "أرشيفات",
    "other": "أخرى",
    "nameAZ": "الاسم (أ-ي)",
    "nameZA": "الاسم (ي-أ)",
    "dateNewest": "تاريخ التعديل (الأحدث)",
    "dateOldest": "تاريخ التعديل (الأقدم)",
    "sizeLargest": "الحجم (الأكبر)",
    "sizeSmallest": "الحجم (الأصغر)",
    "selected": "محدد",
    "noShared": "لم تتم مشاركة أي ملفات أو مجلدات معك.",
    "folders": "المجلدات",
    "files": "الملفات",
    "noStarred": "لا توجد ملفات مميزة بنجمة حتى الآن.",
    "noRecent": "لا توجد ملفات تم الوصول إليها مؤخرًا.",
    "noSearchResults": "لا توجد نتائج لـ",
}

en["drive"].update(en_drive_additions)
ar["drive"].update(ar_drive_additions)

# Admin additions
en_admin_additions = {
    "profileInfo": "Personal Information",
    "security": "Security",
    "currentPassword": "Current Password",
    "newPassword": "New Password",
    "confirmPassword": "Confirm Password",
    "updatePassword": "Update Password"
}

ar_admin_additions = {
    "profileInfo": "المعلومات الشخصية",
    "security": "الأمان",
    "currentPassword": "كلمة المرور الحالية",
    "newPassword": "كلمة المرور الجديدة",
    "confirmPassword": "تأكيد كلمة المرور",
    "updatePassword": "تحديث كلمة المرور"
}

en["admin"].update(en_admin_additions)
ar["admin"].update(ar_admin_additions)

with open(EN_FILE, "w", encoding="utf-8") as f:
    json.dump(en, f, indent=2, ensure_ascii=False)
with open(AR_FILE, "w", encoding="utf-8") as f:
    json.dump(ar, f, indent=2, ensure_ascii=False)

print("Updated translations successfully.")
