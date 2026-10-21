import json

import ckan.plugins as plugins
import ckan.plugins.toolkit as tk

import ckanext.scheme_sddi.helpers as helpers
import ckanext.scheme_sddi.validators as validators

from ckanext.scheme_sddi.views import blueprint

class SchemeSddiPlugin(plugins.SingletonPlugin):
    plugins.implements(plugins.IConfigurer)
    plugins.implements(plugins.IValidators)
    plugins.implements(plugins.ITemplateHelpers)
    plugins.implements(plugins.IBlueprint)

    # IConfigurer

    def update_config(self, config_):
        tk.add_template_directory(config_, "templates")
        tk.add_public_directory(config_, "public")
        tk.add_resource("assets", "scheme_sddi")

    # ITemplateHelpers

    def get_helpers(self):
        return {
            "get_allowable_children_groups": helpers.get_allowable_children_groups,
            "composite_get_as_dict": helpers.composite_get_as_dict,
            "composite_get_value_dict": helpers.composite_get_value_dict,
            "composite_get_label_dict": helpers.composite_get_label_dict,
            "composite_get_choices_dict": helpers.composite_get_choices_dict,
            "composite_get_name_list": helpers.composite_get_name_list,
            "composite_repeating_get_value_dict_list": helpers.composite_repeating_get_value_dict_list,
            "composite_is_mail": helpers.composite_is_mail,
            "composite_is_list": helpers.composite_is_list,
            "composite_join_list": helpers.composite_join_list,
            "composite_get_markup": helpers.composite_get_markup,
            "composite_get_default_value": helpers.composite_get_default_value,
        }

    # IValidators

    def get_validators(self):
        return {
            "required_tags": validators.required_tags,
            "composite_repeating_group2json": validators.composite_repeating_group2json,
            "float_validator": validators.float_validator,
        }

    # IBlueprint
    def get_blueprint(self):
        return [blueprint]
