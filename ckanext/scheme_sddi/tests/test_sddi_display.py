"""Standalone checks: python -m unittest discover -s ckanext/scheme_sddi/tests -p test_sddi_display.py"""
import importlib.util
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from jinja2 import Environment, FileSystemLoader

BASE = Path(__file__).resolve().parents[1]


class SddiDisplayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('sddi_helpers_under_test', BASE / 'helpers.py')
        cls.helpers = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.helpers)
        env = Environment(loader=FileSystemLoader(str(BASE / 'templates')), autoescape=True)
        cls.template = env.get_template('scheming/display_snippets/multiple_select.html')

    def render(self, value, choices=None, **options):
        field = dict(field_name='role', choices=choices or [
            {'value': 'owner', 'label': {'en': 'Owner'}},
            {'value': 'coAuthor', 'label': 'Co-Author'}], **options)
        h = SimpleNamespace(scheming_field_choices=lambda f: f['choices'],
                            scheming_language_text=lambda label: label['en'] if isinstance(label, dict) else label)
        return self.template.render(data={'role': value}, field=field, h=h).strip()

    def test_scalar_exact_match(self):
        self.assertEqual(self.render('coAuthor'), 'Co-Author')
        self.assertEqual(self.render('owner'), 'Owner')

    def test_list_and_sort(self):
        self.assertEqual(self.render(['owner', 'coAuthor']), '<ul><li>Owner</li><li>Co-Author</li></ul>')
        self.assertEqual(self.render(['owner', 'coAuthor'], sorted_choices=True), '<ul><li>Co-Author</li><li>Owner</li></ul>')

    def test_empty(self):
        for value in (None, '', [], [None, '']):
            with self.subTest(value=value):
                self.assertEqual(self.render(value), '')

    def test_unknown_and_html_escaped(self):
        self.assertEqual(self.render('legacy-role'), 'legacy-role')
        self.assertEqual(self.render('<script>'), '&lt;script&gt;')
        self.assertEqual(self.render('owner', [{'value': 'owner', 'label': '<b>Owner</b>'}]), '&lt;b&gt;Owner&lt;/b&gt;')

    def test_descendants_are_returned_unchanged(self):
        group = Mock()
        rows = [SimpleNamespace(id='child', title='Child'), SimpleNamespace(id='grandchild', title='Grandchild')]
        group.get_children_group_hierarchy.return_value = rows
        model = SimpleNamespace(Group=Mock())
        model.Group.get.return_value = group
        with patch.dict(sys.modules, {'ckan': SimpleNamespace(model=model)}):
            self.assertIs(self.helpers.get_allowable_children_groups('main-categories'), rows)
        model.Group.get.assert_called_once_with('main-categories')
        group.get_children_group_hierarchy.assert_called_once_with(type='group')

    def test_missing_parent(self):
        model = SimpleNamespace(Group=Mock())
        model.Group.get.return_value = None
        with patch.dict(sys.modules, {'ckan': SimpleNamespace(model=model)}):
            self.assertEqual(self.helpers.get_allowable_children_groups('missing'), [])

    def test_no_parent(self):
        model = SimpleNamespace(Group=Mock())
        with patch.dict(sys.modules, {'ckan': SimpleNamespace(model=model)}):
            self.assertIs(self.helpers.get_allowable_children_groups(None), model.Group.all.return_value)
        model.Group.all.assert_called_once_with(group_type='group')


if __name__ == '__main__':
    unittest.main()
