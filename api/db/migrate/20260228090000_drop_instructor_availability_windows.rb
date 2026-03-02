class DropInstructorAvailabilityWindows < ActiveRecord::Migration[8.1]
  def change
    drop_table :instructor_availability_windows, if_exists: true
  end
end
