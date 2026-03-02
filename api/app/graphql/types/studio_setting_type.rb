module Types
  class StudioSettingType < Types::BaseObject
    field :dashboard_title, String, null: false
    field :default_theme, String, null: false
    field :clients_page_enabled, Boolean, null: false
  end
end
