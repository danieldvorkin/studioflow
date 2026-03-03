class AddOnboardingCompletedAtToStudios < ActiveRecord::Migration[8.1]
  def change
    add_column :studios, :onboarding_completed_at, :datetime
  end
end
