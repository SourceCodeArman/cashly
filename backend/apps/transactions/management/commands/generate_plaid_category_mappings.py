"""
Management command to generate Plaid category mappings from CSV taxonomy.
"""
import csv
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings

from apps.transactions.category_mapper_generator import (
    load_taxonomy_csv,
    generate_plaid_category_mappings,
    _generate_mapping_dict_code,
)

logger = __import__('logging').getLogger(__name__)


class Command(BaseCommand):
    help = 'Generate Plaid category mappings from CSV taxonomy file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-path',
            type=str,
            help='Path to CSV taxonomy file (default: looks in project root)',
        )
        parser.add_argument(
            '--update-mapper',
            action='store_true',
            help='Update plaid_category_mapper.py with generated mappings',
        )
        parser.add_argument(
            '--output',
            type=str,
            help='Output file path for generated mappings (Python dict format)',
        )

    def handle(self, *args, **options):
        csv_path = options.get('csv_path')
        update_mapper = options.get('update_mapper', False)
        output_path = options.get('output')

        try:
            # Load taxonomy CSV
            self.stdout.write("Loading taxonomy CSV...")
            taxonomy_categories = load_taxonomy_csv(csv_path)
            self.stdout.write(
                self.style.SUCCESS(f'Loaded {len(taxonomy_categories)} categories')
            )

            # Generate mappings
            self.stdout.write("Generating category mappings...")
            detailed_mapping, primary_mapping = generate_plaid_category_mappings(
                taxonomy_categories=taxonomy_categories
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Generated {len(detailed_mapping)} detailed mappings and '
                    f'{len(primary_mapping)} primary mappings'
                )
            )

            # Display sample mappings
            self.stdout.write("\nSample Detailed Mappings:")
            for i, (key, value) in enumerate(list(detailed_mapping.items())[:5]):
                self.stdout.write(f"  {key}: {value}")

            self.stdout.write("\nSample Primary Mappings:")
            for i, (key, value) in enumerate(list(primary_mapping.items())[:5]):
                self.stdout.write(f"  {key}: {value}")

            # Update mapper file if requested
            if update_mapper:
                self.stdout.write("\nUpdating plaid_category_mapper.py...")
                self._update_mapper_file(detailed_mapping, primary_mapping)
                self.stdout.write(
                    self.style.SUCCESS('Successfully updated plaid_category_mapper.py')
                )

            # Write to output file if specified
            if output_path:
                self.stdout.write(f"\nWriting mappings to {output_path}...")
                self._write_mappings_to_file(
                    detailed_mapping, primary_mapping, output_path
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully wrote mappings to {output_path}')
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating mappings: {str(e)}')
            )
            raise

    def _update_mapper_file(self, detailed_mapping, primary_mapping):
        """Update plaid_category_mapper.py with generated mappings."""
        mapper_file_path = Path(__file__).parent.parent.parent / 'plaid_category_mapper.py'

        # Read existing file
        with open(mapper_file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Generate new mapping code (with comments)
        detailed_code_lines = self._generate_mapping_dict_with_comments(
            detailed_mapping, "PLAID_DETAILED_CATEGORY_MAPPING"
        ).splitlines(keepends=False)
        primary_code_lines = self._generate_mapping_dict_with_comments(
            primary_mapping, "PLAID_PRIMARY_CATEGORY_MAPPING"
        ).splitlines(keepends=False)

        # Find the start and end of each mapping dictionary
        new_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Check if we're at the start of detailed mapping
            if 'PLAID_DETAILED_CATEGORY_MAPPING = {' in line:
                # Add the new mapping code (each line with newline)
                for code_line in detailed_code_lines:
                    new_lines.append(code_line + '\n')
                # Skip until we find the closing brace of the dictionary
                brace_count = line.count('{') - line.count('}')
                i += 1
                while i < len(lines) and brace_count > 0:
                    brace_count += lines[i].count('{') - lines[i].count('}')
                    i += 1
                # Skip the line with the closing brace (already processed)
                continue
            
            # Check if we're at the start of primary mapping
            elif 'PLAID_PRIMARY_CATEGORY_MAPPING = {' in line:
                # Add the new mapping code (each line with newline)
                for code_line in primary_code_lines:
                    new_lines.append(code_line + '\n')
                # Skip until we find the closing brace of the dictionary
                brace_count = line.count('{') - line.count('}')
                i += 1
                while i < len(lines) and brace_count > 0:
                    brace_count += lines[i].count('{') - lines[i].count('}')
                    i += 1
                # Skip the line with the closing brace (already processed)
                continue
            
            # Otherwise, keep the line
            new_lines.append(line)
            i += 1

        # Write updated content
        with open(mapper_file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)

    def _generate_mapping_dict_with_comments(self, mapping, var_name):
        """Generate Python dictionary code with comments grouped by primary category."""
        lines = [f"# Mapping of Plaid {var_name.replace('PLAID_', '').replace('_MAPPING', '').lower().replace('_', ' ')} to system category names",
                 f"# Format: \"PLAID_CATEGORY\": (\"system_category_name\", \"category_type\")",
                 f"{var_name} = {{"]
        
        # Group by primary category prefix for better organization
        from collections import defaultdict
        by_primary = defaultdict(list)
        
        for key in sorted(mapping.keys()):
            # Extract primary category prefix
            parts = key.split('_')
            if len(parts) >= 2:
                # For detailed categories, take first two parts (e.g., "FOOD_AND_DRINK")
                # For primary-only categories, just use the key
                if len(parts) > 2:
                    primary = '_'.join(parts[:2])  # e.g., "FOOD_AND_DRINK"
                else:
                    primary = key  # Primary category itself
            else:
                primary = key
            by_primary[primary].append(key)
        
        # Generate organized output grouped by primary category
        sorted_primaries = sorted(by_primary.keys())
        for i, primary in enumerate(sorted_primaries):
            # Add comment for primary category group
            primary_display = primary.replace('_', ' ').title()
            lines.append(f"    # {primary_display}")
            
            for key in sorted(by_primary[primary]):
                system_category, category_type = mapping[key]
                lines.append(f'    "{key}": ("{system_category}", "{category_type}"),')
            
            # Add blank line between groups (except last)
            if i < len(sorted_primaries) - 1:
                lines.append("")
        
        lines.append("}")
        
        return "\n".join(lines)
    
    def _write_mappings_to_file(self, detailed_mapping, primary_mapping, output_path):
        """Write mappings to a file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("# Generated Plaid Category Mappings\n\n")
            f.write(self._generate_mapping_dict_with_comments(detailed_mapping, "PLAID_DETAILED_CATEGORY_MAPPING"))
            f.write("\n\n")
            f.write(self._generate_mapping_dict_with_comments(primary_mapping, "PLAID_PRIMARY_CATEGORY_MAPPING"))

