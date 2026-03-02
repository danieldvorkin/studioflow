class AddUniqueIndexToClassSessions < ActiveRecord::Migration[8.1]
  class MigrationClassSession < ActiveRecord::Base
    self.table_name = 'class_sessions'
  end

  class MigrationBooking < ActiveRecord::Base
    self.table_name = 'bookings'
  end

  def up
    say_with_time 'Deduplicating class_sessions (class_template_id, start_time)' do
      duplicate_keys = MigrationClassSession
        .group(:class_template_id, :start_time)
        .having('COUNT(*) > 1')
        .pluck(:class_template_id, :start_time)

      duplicate_keys.each do |(template_id, start_time)|
        session_ids = MigrationClassSession
          .where(class_template_id: template_id, start_time: start_time)
          .order(:id)
          .pluck(:id)

        bookings_count_by_session_id = MigrationBooking
          .where(class_session_id: session_ids)
          .group(:class_session_id)
          .count

        keep_id = session_ids
          .max_by { |sid| [ bookings_count_by_session_id[sid].to_i, -sid ] }

        to_fix_ids = session_ids - [ keep_id ]

        to_fix_ids.each do |sid|
          bookings_count = bookings_count_by_session_id[sid].to_i

          if bookings_count.zero?
            MigrationClassSession.where(id: sid).delete_all
            next
          end

          session = MigrationClassSession.find_by(id: sid)
          next unless session

          offset_seconds = 1
          new_start = session.start_time

          loop do
            candidate = session.start_time + offset_seconds.seconds
            break new_start = candidate unless MigrationClassSession.where(class_template_id: template_id, start_time: candidate).exists?
            offset_seconds += 1
          end

          new_end = session.end_time.present? ? (session.end_time + offset_seconds.seconds) : nil

          attrs = { start_time: new_start }
          attrs[:end_time] = new_end if session.has_attribute?(:end_time)
          attrs[:updated_at] = Time.current if session.has_attribute?(:updated_at)

          session.update_columns(**attrs)
        end
      end
    end

    add_index :class_sessions, [ :class_template_id, :start_time ], unique: true
  end

  def down
    remove_index :class_sessions, column: [ :class_template_id, :start_time ]
  end
end
