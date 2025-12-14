"""
Fix categories with empty dict rules to empty list.

This migration fixes categories where rules field is {} (empty dict)
and updates them to [] (empty list) for proper JSON array serialization.
"""

from django.db import migrations


def fix_rules_format(apps, schema_editor):
    """Convert rules from {} to [] where applicable."""
    Category = apps.get_model("transactions", "Category")

    # Find categories with empty dict rules
    categories_to_fix = Category.objects.filter(rules={})
    count = categories_to_fix.count()

    if count > 0:
        print(f"Fixing {count} categories with empty dict rules...")
        categories_to_fix.update(rules=[])
        print(f"Fixed {count} categories")
    else:
        print("No categories to fix")


class Migration(migrations.Migration):
    dependencies = [
        ("transactions", "0001_initial"),  # Adjust this to your latest migration
    ]

    operations = [
        migrations.RunPython(fix_rules_format, reverse_code=migrations.RunPython.noop),
    ]
