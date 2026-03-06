class CreateApiTokens < ActiveRecord::Migration[8.1]
  def change
    create_table :api_tokens do |t|
      t.references :user,   null: false, foreign_key: true
      t.references :studio, null: false, foreign_key: true
      t.string  :name,         null: false
      t.string  :token_digest, null: false          # bcrypt hash of the raw token
      t.string  :token_prefix, null: false          # first 8 chars shown in UI
      t.datetime :last_used_at
      t.datetime :expires_at
      t.datetime :revoked_at

      t.timestamps
    end

    add_index :api_tokens, :token_digest, unique: true
    add_index :api_tokens, [ :user_id, :studio_id ]
  end
end
