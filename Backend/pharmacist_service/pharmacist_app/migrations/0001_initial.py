# Generated by Django 5.2.1 on 2025-05-14 15:51

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Pharmacist',
            fields=[
                ('user_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('pharmacy_name', models.CharField(max_length=200)),
                ('pharmacy_license_number', models.CharField(max_length=50, unique=True)),
                ('phone_number', models.CharField(blank=True, max_length=20, null=True)),
                ('address', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Pharmacist Profile',
                'verbose_name_plural': 'Pharmacist Profiles',
            },
        ),
    ]
