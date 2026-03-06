#!/usr/bin/env ruby
# Usage: bundle exec rails runner script/check_do_spaces.rb
# Checks that the Digital Ocean Spaces bucket is reachable and credentials work.

require "aws-sdk-s3"

puts "=== Digital Ocean Spaces Connection Check ===\n\n"

begin
  # 1. Verify env vars
  vars = %w[DO_SPACES_KEY DO_SPACES_SECRET DO_SPACES_REGION DO_SPACES_BUCKET DO_SPACES_ENDPOINT]
  missing = vars.reject { |k| ENV[k].present? }

  vars.each do |k|
    status = ENV[k].present? ? "\e[32m[SET]\e[0m" : "\e[31m[MISSING]\e[0m"
    puts "  #{k.ljust(22)} #{status}"
  end

  if missing.any?
    puts "\n\e[31mAbort: missing env vars: #{missing.join(', ')}\e[0m"
    exit 1
  end

  puts "\nAll env vars present. Testing connection...\n\n"

  # 2. Build S3 client
  s3 = Aws::S3::Client.new(
    access_key_id:     ENV["DO_SPACES_KEY"],
    secret_access_key: ENV["DO_SPACES_SECRET"],
    region:            ENV["DO_SPACES_REGION"],
    endpoint:          ENV["DO_SPACES_ENDPOINT"],
    force_path_style:  false
  )

  bucket = ENV["DO_SPACES_BUCKET"]
  test_key = "_connection_check_#{Time.now.to_i}.txt"

  # 3. Write
  print "  [1/3] Uploading test object... "
  s3.put_object(bucket: bucket, key: test_key, body: "connection-check", acl: "private")
  puts "\e[32mOK\e[0m"

  # 4. Read back
  print "  [2/3] Fetching test object...  "
  resp = s3.get_object(bucket: bucket, key: test_key)
  body = resp.body.read
  raise "Body mismatch: got '#{body}'" unless body == "connection-check"
  puts "\e[32mOK\e[0m"

  # 5. Delete
  print "  [3/3] Deleting test object...  "
  s3.delete_object(bucket: bucket, key: test_key)
  puts "\e[32mOK\e[0m"

  puts "\n\e[32mSuccess! Bucket '#{bucket}' is live and fully operational.\e[0m\n"

rescue Aws::S3::Errors::InvalidAccessKeyId, Aws::S3::Errors::SignatureDoesNotMatch => e
  puts "\e[31mFAILED (auth error): #{e.message}\e[0m"
  exit 1
rescue Aws::S3::Errors::NoSuchBucket => e
  puts "\e[31mFAILED (bucket not found): #{e.message}\e[0m"
  exit 1
rescue => e
  puts "\e[31mFAILED: #{e.class} - #{e.message}\e[0m"
  exit 1
end
