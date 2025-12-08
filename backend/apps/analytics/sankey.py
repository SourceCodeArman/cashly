from django.db import models
from django.db.models import Sum, F
from django.db.models.functions import Coalesce
from apps.transactions.models import Transaction
from decimal import Decimal

def get_sankey_data(user, start_date, end_date):
    """
    Generate Sankey diagram data for a given user and date range.
    Flow: Income Categories -> Cash Flow -> Expense Categories
    """
    # 1. Fetch transactions
    transactions = Transaction.objects.filter(
        user=user,
        date__range=[start_date, end_date],
        is_transfer=False  # Exclude transfers
    )

    # 2. Aggregate Income by Category
    income_data = transactions.filter(amount__gt=0).values(
        category_name=Coalesce('category__name', 'subcategory', 'description', output_field=models.TextField()),
        category_color=F('category__color')
    ).annotate(
        total=Sum('amount')
    ).order_by('-total')

    # Handle uncategorized income or ensure names are clean
    income_sources = {}
    income_colors = {}
    total_income = Decimal('0.00')
    
    for item in income_data:
        name = item['category_name'] or "Uncategorized Income"
        amount = item['total']
        color = item['category_color'] or '#10b981'  # Default green for income
        income_sources[name] = income_sources.get(name, Decimal('0.00')) + amount
        income_colors[name] = color
        total_income += amount

    # 3. Aggregate Expenses by Category
    # Note: Expenses are stored as negative numbers, so we sum them and take absolute value
    expense_data = transactions.filter(amount__lt=0).values(
        category_name=Coalesce('category__name', 'subcategory', 'description', output_field=models.TextField()),
        category_color=F('category__color')
    ).annotate(
        total=Sum('amount')
    ).order_by('total') # Ascending because they are negative

    expense_targets = {}
    expense_colors = {}
    total_expenses = Decimal('0.00')

    for item in expense_data:
        name = item['category_name'] or "Uncategorized Expense"
        amount = abs(item['total'])
        color = item['category_color'] or '#ef4444'  # Default red for expenses
        expense_targets[name] = expense_targets.get(name, Decimal('0.00')) + amount
        expense_colors[name] = color
        total_expenses += amount

    # 4. Construct Nodes and Links
    nodes = []
    links = []
    node_indices = {}

    def get_node_index(name, color='#8b5cf6'):
        if name not in node_indices:
            node_indices[name] = len(nodes)
            nodes.append({"name": name, "color": color})
        return node_indices[name]

    # Central Node (purple/primary)
    cash_flow_node = "Cash Flow"
    cash_flow_idx = get_node_index(cash_flow_node, '#8b5cf6')

    # Add Income Links (Source -> Cash Flow) - Use category colors
    for name, amount in income_sources.items():
        color = income_colors.get(name, '#10b981')
        source_idx = get_node_index(name, color)
        links.append({
            "source": source_idx,
            "target": cash_flow_idx,
            "value": float(amount)
        })

    # Add Expense Links (Cash Flow -> Target) - Use category colors
    for name, amount in expense_targets.items():
        color = expense_colors.get(name, '#ef4444')
        target_idx = get_node_index(name, color)
        links.append({
            "source": cash_flow_idx,
            "target": target_idx,
            "value": float(amount)
        })

    # 5. Balance the Flow
    # If Income > Expenses, add "Savings" output (green)
    if total_income > total_expenses:
        savings = total_income - total_expenses
        savings_idx = get_node_index("Net Savings", '#22c55e')
        links.append({
            "source": cash_flow_idx,
            "target": savings_idx,
            "value": float(savings)
        })
    
    # If Expenses > Income, add "Deficit/Credit" input (red)
    elif total_expenses > total_income:
        deficit = total_expenses - total_income
        deficit_idx = get_node_index("From Savings/Debt", '#dc2626')
        links.append({
            "source": deficit_idx,
            "target": cash_flow_idx,
            "value": float(deficit)
        })

    return {
        "nodes": nodes,
        "links": links
    }
