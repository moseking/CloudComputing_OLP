# Cloud Deployment and Cost Notes

This guide describes the Member 3 handoff for deploying the Docker Compose demo to one Ubuntu 24.04 LTS VM. AWS EC2 is the selected target because the project handoff calls for an EC2 deployment and the existing Compose stack already packages the complete demo as one host workload. The same stack can also run on Google Compute Engine.

## 1. AWS EC2 and Google Compute Engine comparison

The estimate below compares small, Linux shared-core VMs for a continuously running 30-day demo. It uses published US-region reference rates and 730 hours/month; it is not a quote for a different region. AWS figures use US East (N. Virginia); Google figures use the Iowa (us-central1) price row. Taxes, outbound data transfer, backups, snapshots, and any account credits are excluded.

| Provider / option | Compute | Example monthly compute | Example 20 GB boot disk | Public IPv4 / month | Approximate subtotal |
| --- | --- | ---: | ---: | ---: | ---: |
| AWS EC2 `t3.small`, Ubuntu 24.04 LTS | 2 vCPU, 2 GiB RAM; $0.0209/hour | $15.26 | $1.60 at an example $0.08/GB-month gp3 rate | $3.65 | **$20.51** |
| Google Compute Engine `e2-small`, Ubuntu 24.04 LTS | 2 vCPU, 2 GiB RAM; $0.016752855/hour | $12.23 | $0.80 using the US standard persistent-disk example rate of $0.04/GB-month | $3.65 | **$16.68** |

AWS lists `t3.small` at $0.0209/hour for Linux in US East and shows 2 vCPU with 2 GiB memory. Google lists `e2-small` at $0.016752855/hour in its Iowa price table. Disk and public IPv4 prices vary by provider, region, and configuration; AWS gp3 is shown at an example regional rate of $0.08/GB-month, and AWS and Google both list in-use external IPv4 at $0.005/hour. See [AWS T3 pricing](https://aws.amazon.com/ec2/instance-types/t3/), [Google Compute Engine general-purpose pricing](https://cloud.google.com/products/compute/pricing/general-purpose), [AWS EBS pricing](https://aws.amazon.com/ebs/pricing/), [AWS VPC pricing](https://aws.amazon.com/vpc/pricing/), [Google disk pricing](https://cloud.google.com/compute/disks-image-pricing), and [Google VPC pricing](https://cloud.google.com/vpc/network-pricing).

Select EC2 for this handoff to meet the requested AWS deployment target and keep the demonstration aligned with the course's EC2 evidence. `t3.small` matches the 2 GiB baseline and is a low-cost starting point, though the full stack can be memory constrained. If containers restart or the VM swaps heavily, resize to `t3.medium` (2 vCPU, 4 GiB) and recalculate; its compute-only reference rate is about $30.51/month at $0.0418/hour. Recheck the [AWS Pricing Calculator](https://calculator.aws/) for the chosen region and current settings before launch. On-demand charges continue while the instance runs. The public address alone is about $3.65/month at $0.005/hour when active, so stop or delete resources after the demo.

## 2. AWS Budgets alert

Create a monthly cost budget in **Billing and Cost Management → Budgets → Create budget**. Choose a monthly cost budget, set a conservative cap (for example, `$30` for the `t3.small` one-month demo), and add email alerts at 50% and 80% actual cost plus 100% forecasted cost. Verify the email subscription. AWS Budgets supports actual and forecasted thresholds and email recipients; alerts can arrive after cost has already changed, so they are notifications, not a hard spending limit. Follow [AWS's cost budget steps](https://docs.aws.amazon.com/cost-management/latest/userguide/create-cost-budget.html).

## 3. Deploy to an EC2 instance

1. In the AWS console, launch Ubuntu Server 24.04 LTS on a `t3.small` instance, with a 20 GiB gp3 root volume for a short demo. Choose a region near the demo audience and use its calculator price before launch.
2. Create a Security Group with inbound SSH TCP `22` from **My IP** only. Add inbound TCP `80` from the audience that needs the public demo; if using port `8080`, open TCP `8080` instead. Do not add inbound rules for PostgreSQL `5432` or service ports `8000`. Use the instance's outbound internet access for package and image downloads.
3. Connect over SSH and install Docker Engine plus the Compose plugin using Docker's official [Ubuntu installation guide](https://docs.docker.com/engine/install/ubuntu/). Add the `ubuntu` user to the `docker` group only if appropriate for the instance, then reconnect so the group membership takes effect.
4. Clone the repository and enter its root directory:

   ```bash
   git clone <repository-url>
   cd CloudComputing_OLP
   ```

5. Initialize the ignored environment file and RS256 key pair:

   ```bash
   bash scripts/setup-env.sh
   ```

   The script creates `.env` from the safe template, replaces every `CHANGE_ME` secret with random data, creates `.secrets/jwt-private.pem` and `.secrets/jwt-public.pem` if absent, and checks an existing key pair without overwriting it. Keep `.env` and `.secrets/` private; do not copy them into Git.

6. Edit `.env` on the instance and set the public bind and desired host port:

   ```dotenv
   NGINX_BIND_ADDRESS=0.0.0.0
   NGINX_HOST_PORT=80
   ```

   `0.0.0.0` makes the published Nginx port reachable on the VM interfaces. The Security Group remains the external network filter. For an `8080` demo, set `NGINX_HOST_PORT=8080` and allow inbound `8080` instead.

7. Validate and start the complete stack:

   ```bash
   docker compose config --quiet
   docker compose up -d --build
   docker compose ps
   curl --fail http://127.0.0.1/health
   python3 scripts/test-payment-flow.py --base-url http://127.0.0.1
   ```

   From another network, open `http://<EC2-public-ip>/`. If using port 8080, append `:8080`. The integration script signs in a demo admin from `.env` to simulate payment results and writes a redacted success/failure record to `docs/payment-flow-sample.json`.

## 4. Monitor and operate

Run these commands from the repository root:

```bash
docker compose ps
docker compose logs --tail=100
docker compose logs -f payment-service course-service nginx
docker stats
curl --fail http://127.0.0.1/health
curl --fail http://127.0.0.1/services/payments/health
curl --fail http://127.0.0.1/services/payments/ready
docker compose restart payment-service
docker compose up -d --build payment-service
```

`/health` checks the gateway or service process; `/services/payments/ready` also verifies Payment Service's database connection. Compose restarts unhealthy containers according to the configured restart policy. Review `docker compose logs` before restarting a failing service.

For rollback, deploy from a known-good Git commit or tag and rebuild the affected service or full stack:

```bash
git fetch --tags
git switch --detach <known-good-tag-or-commit>
docker compose up -d --build
```

The ignored `.env` and `.secrets/` stay on the VM across this source rollback. Keep database backups separately before schema changes; do not use `docker compose down -v` for a rollback unless you intentionally want to delete the database volume.

## 5. Teardown checklist after the demo

- Save only the required screenshots/log excerpts and redact public IPs, credentials, tokens, and key material.
- Stop the Compose stack. If database data is no longer needed, remove the containers and named volume with `docker compose down -v`; back up anything that must be retained first.
- Stop or terminate the EC2 instance. Termination removes the instance but check EBS volumes and snapshots separately.
- Release any Elastic IP that is no longer needed; check whether an unattached address is billable.
- Delete unused EBS volumes and snapshots, temporary AMIs, and any extra network interfaces.
- Remove the temporary Security Group and key pair if nothing else uses them. Keep SSH restricted to My IP until cleanup.
- Review Cost Explorer and the AWS Budget alert after teardown; remove unused resources even if an alert has not fired.

## 6. Local payment-flow evidence

`docs/payment-flow-sample.json` is generated by `scripts/test-payment-flow.py`. It records health results, `PENDING → SUCCESS`, confirmed course access, and a separate `FAILED` payment without storing login credentials or JWTs.
