# Load simple key=value pairs from .env into ENV for development.
# This avoids adding dotenv as a dependency; it only runs in non-production.
if Rails.env.development? || Rails.env.test?
  env_file = Rails.root.join(".env")
  if File.exist?(env_file)
    File.read(env_file).each_line do |line|
      next if line.strip.empty? || line.strip.start_with?("#")
      key, val = line.split("=", 2)
      next unless key && val
      key = key.strip
      val = val.strip.gsub(/\A"|"\z/, "")
      ENV[key] = val if ENV[key].nil? || ENV[key].empty?
    end
  end
end
