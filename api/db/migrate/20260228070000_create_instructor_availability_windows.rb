class CreateInstructorAvailabilityWindows < ActiveRecord::Migration[8.1]
  def change
    create_table :instructor_availability_windows do |t|
      t.bigint :instructor_id, null: false
      t.datetime :start_time, null: false
      t.datetime :end_time, null: false
      t.bigint :studio_location_id

      t.timestamps
    end

    add_index :instructor_availability_windows, :instructor_id
    add_index :instructor_availability_windows, [:instructor_id, :start_time]
    add_index :instructor_availability_windows, :studio_location_id
  end
end
