class StudioLocation < ApplicationRecord
  belongs_to :studio
  has_many :class_templates
  validates :name, presence: true
end
