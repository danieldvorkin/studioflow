# frozen_string_literal: true

class AddStudiosAndScoping < ActiveRecord::Migration[8.1]
  def up
    create_table :studios, if_not_exists: true do |t|
      t.string :name, null: false
      t.string :slug
      t.timestamps
    end

    add_index :studios, :slug, unique: true, if_not_exists: true

    unless column_exists?(:users, :studio_id)
      add_reference :users, :studio, foreign_key: true, index: false
    end
    unless column_exists?(:studio_locations, :studio_id)
      add_reference :studio_locations, :studio, foreign_key: true, index: false
    end
    unless column_exists?(:class_templates, :studio_id)
      add_reference :class_templates, :studio, foreign_key: true, index: false
    end
    unless column_exists?(:class_sessions, :studio_id)
      add_reference :class_sessions, :studio, foreign_key: true, index: false
    end
    unless column_exists?(:clients, :studio_id)
      add_reference :clients, :studio, foreign_key: true, index: false
    end
    unless column_exists?(:bookings, :studio_id)
      add_reference :bookings, :studio, foreign_key: true, index: false
    end
    unless column_exists?(:payments, :studio_id)
      add_reference :payments, :studio, foreign_key: true, index: false
    end
    unless column_exists?(:instructor_payouts, :studio_id)
      add_reference :instructor_payouts, :studio, foreign_key: true, index: false
    end
    unless column_exists?(:instructor_client_blocks, :studio_id)
      add_reference :instructor_client_blocks, :studio, foreign_key: true, index: false
    end
    unless column_exists?(:client_payment_methods, :studio_id)
      add_reference :client_payment_methods, :studio, foreign_key: true, index: false
    end
    unless column_exists?(:payment_settings, :studio_id)
      add_reference :payment_settings, :studio, foreign_key: true, index: false
    end

    studio_id = backfill_default_studio_id!
    backfill_foreign_keys!(studio_id)

    %i[
      users
      studio_locations
      class_templates
      class_sessions
      clients
      bookings
      payments
      instructor_payouts
      instructor_client_blocks
      client_payment_methods
      payment_settings
    ].each do |table|
      change_column_null table, :studio_id, false
    end

    add_index :users, :studio_id, if_not_exists: true
    add_index :clients, :studio_id, if_not_exists: true
    add_index :studio_locations, :studio_id, if_not_exists: true
    add_index :class_templates, :studio_id, if_not_exists: true
    add_index :class_sessions, :studio_id, if_not_exists: true
    add_index :bookings, :studio_id, if_not_exists: true
    add_index :payments, :studio_id, if_not_exists: true
    add_index :instructor_payouts, :studio_id, if_not_exists: true
  end

  def down
    remove_reference :payment_settings, :studio, foreign_key: true
    remove_reference :client_payment_methods, :studio, foreign_key: true
    remove_reference :instructor_client_blocks, :studio, foreign_key: true
    remove_reference :instructor_payouts, :studio, foreign_key: true
    remove_reference :payments, :studio, foreign_key: true
    remove_reference :bookings, :studio, foreign_key: true
    remove_reference :clients, :studio, foreign_key: true
    remove_reference :class_sessions, :studio, foreign_key: true
    remove_reference :class_templates, :studio, foreign_key: true
    remove_reference :studio_locations, :studio, foreign_key: true
    remove_reference :users, :studio, foreign_key: true

    drop_table :studios
  end

  private

  def backfill_default_studio_id!
    execute("INSERT INTO studios (name, slug, created_at, updated_at) VALUES ('Demo Studio', 'demo', NOW(), NOW()) ON CONFLICT (slug) DO NOTHING")
    select_value("SELECT id FROM studios WHERE slug = 'demo' LIMIT 1").to_i
  end

  def backfill_foreign_keys!(studio_id)
    execute("UPDATE users SET studio_id = #{studio_id} WHERE studio_id IS NULL")
    execute("UPDATE studio_locations SET studio_id = #{studio_id} WHERE studio_id IS NULL")
    execute("UPDATE class_templates SET studio_id = #{studio_id} WHERE studio_id IS NULL")

    execute(<<~SQL)
      UPDATE class_sessions
      SET studio_id = class_templates.studio_id
      FROM class_templates
      WHERE class_sessions.class_template_id = class_templates.id
        AND class_sessions.studio_id IS NULL
    SQL
    execute("UPDATE class_sessions SET studio_id = #{studio_id} WHERE studio_id IS NULL")

    execute("UPDATE clients SET studio_id = #{studio_id} WHERE studio_id IS NULL")

    execute(<<~SQL)
      UPDATE bookings
      SET studio_id = clients.studio_id
      FROM clients
      WHERE bookings.client_id = clients.id
        AND bookings.studio_id IS NULL
    SQL
    execute("UPDATE bookings SET studio_id = #{studio_id} WHERE studio_id IS NULL")

    execute(<<~SQL)
      UPDATE payments
      SET studio_id = bookings.studio_id
      FROM bookings
      WHERE payments.booking_id = bookings.id
        AND payments.studio_id IS NULL
    SQL
    execute("UPDATE payments SET studio_id = #{studio_id} WHERE studio_id IS NULL")

    execute("UPDATE instructor_payouts SET studio_id = #{studio_id} WHERE studio_id IS NULL")

    execute(<<~SQL)
      UPDATE instructor_client_blocks
      SET studio_id = clients.studio_id
      FROM clients
      WHERE instructor_client_blocks.client_id = clients.id
        AND instructor_client_blocks.studio_id IS NULL
    SQL
    execute("UPDATE instructor_client_blocks SET studio_id = #{studio_id} WHERE studio_id IS NULL")

    execute(<<~SQL)
      UPDATE client_payment_methods
      SET studio_id = clients.studio_id
      FROM clients
      WHERE client_payment_methods.client_id = clients.id
        AND client_payment_methods.studio_id IS NULL
    SQL
    execute("UPDATE client_payment_methods SET studio_id = #{studio_id} WHERE studio_id IS NULL")

    execute("UPDATE payment_settings SET studio_id = #{studio_id} WHERE studio_id IS NULL")
  end
end
